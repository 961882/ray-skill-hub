import { lstat, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { buildClaudeCodeSkillDocument } from "../adapters/claude-code.js";
import { buildCodexSkillDocument } from "../adapters/codex.js";
import { buildOpenClawSkillDocument } from "../adapters/openclaw.js";
import { getAgentDefinition } from "./agents.js";
import { discoverSkills } from "./discovery.js";
import {
  loadInstallState,
  appendSyncHistory,
  removeInstallRecords,
  upsertInstallRecord,
  type InstallRecord,
  type SyncHistoryRecord
} from "./install-state.js";
import type { WorkspacePaths } from "./paths.js";
import { getAdapter } from "../adapters/index.js";
import { hashSkillDirectory } from "../utils/hash.js";
import type { AgentDefinition } from "../types/agent.js";
import type { SkillDescriptor } from "../types/skill.js";
import {
  SYNC_REASON_CODES,
  type SyncExecutionSummary,
  type SyncIssueDetails,
  type SyncPreflightResult,
  type SyncRepairSummary,
  type SyncReasonCode
} from "../types/sync.js";
import { maxRiskLevel, type RiskLevel } from "../types/risk.js";

async function computeExpectedInstalledHash(descriptor: SkillDescriptor, agentName: string): Promise<string> {
  if ((agentName === "codex" || agentName === "claude-code" || agentName === "openclaw") && descriptor.manifest && descriptor.entryPath) {
    const sourceContent = await readFile(descriptor.entryPath, "utf8");
    const renderedEntry =
      agentName === "codex"
        ? buildCodexSkillDocument(descriptor.manifest, sourceContent)
        : agentName === "claude-code"
          ? buildClaudeCodeSkillDocument(descriptor.manifest, sourceContent)
          : buildOpenClawSkillDocument(descriptor.manifest, sourceContent);
    return hashSkillDirectory(descriptor.skillPath, {
      overrides: {
        [descriptor.manifest.entry]: renderedEntry
      }
    });
  }

  return hashSkillDirectory(descriptor.skillPath);
}

export function getSyncReasonSuggestion(reasonCode: SyncReasonCode): string | undefined {
  switch (reasonCode) {
    case SYNC_REASON_CODES.skillStructureIncomplete:
      return "补齐有效的 manifest 和 entry 文件，再重新执行 sync。";
    case SYNC_REASON_CODES.entryPathEscape:
      return "把 manifest.entry 改成 skill 目录内的相对路径。";
    case SYNC_REASON_CODES.transformEntryNotMarkdown:
      return "把 entry 改成 .md 文件，或避免把该 skill 同步到 transform 类 agent。";
    case SYNC_REASON_CODES.resourcePathEscape:
      return "把 resources 中的路径改成 skill 目录内的相对路径。";
    case SYNC_REASON_CODES.resourceNotFound:
      return "补齐缺失资源文件，或从 manifest.resources 中移除无效声明。";
    case SYNC_REASON_CODES.targetPathConflict:
      return "修改 skill 名称或清理冲突的已安装目标路径后再重试。";
    case SYNC_REASON_CODES.targetRootInvalid:
      return "把 agent 的安装目录改成有效目录。";
    case SYNC_REASON_CODES.targetRootNotWritable:
      return "确认目标目录存在写权限，或改用可写的安装目录。";
    case SYNC_REASON_CODES.requestedSkillNotFound:
      return "确认 skill 名称存在，并检查是否拼写正确。";
    default:
      return undefined;
  }
}

export function getSyncRiskLevel(reasonCode: SyncReasonCode): RiskLevel {
  switch (reasonCode) {
    case SYNC_REASON_CODES.unsupportedSkill:
    case SYNC_REASON_CODES.noSourceChanges:
    case SYNC_REASON_CODES.requestedSkillNotFound:
      return "low";
    case SYNC_REASON_CODES.resourceNotFound:
    case SYNC_REASON_CODES.transformEntryNotMarkdown:
      return "medium";
    default:
      return "high";
  }
}

function withIssueMetadata<T extends object>(
  target: T,
  metadata: { suggestion?: string; details?: SyncIssueDetails }
): T & { suggestion?: string; details?: SyncIssueDetails } {
  if (!metadata.suggestion && !metadata.details) {
    return target;
  }

  return {
    ...target,
    ...(metadata.suggestion ? { suggestion: metadata.suggestion } : {}),
    ...(metadata.details ? { details: metadata.details } : {})
  };
}

function createIssueMetadata(suggestion?: string, details?: SyncIssueDetails): { suggestion?: string; details?: SyncIssueDetails } {
  return {
    ...(suggestion ? { suggestion } : {}),
    ...(details ? { details } : {})
  };
}

export async function runSyncPreflight(
  paths: WorkspacePaths,
  agentName: string,
  options: { dryRun?: boolean } = {}
): Promise<SyncPreflightResult[]> {
  const agent = await getAgentDefinition(paths.registryDir, agentName);
  if (!agent) {
    return [];
  }

  const adapter = getAdapter(agent.adapterName);
  if (!adapter) {
    return [];
  }

  const [descriptors, installState] = await Promise.all([
    discoverSkills(paths.skillsDir),
    loadInstallState(paths.stateDir)
  ]);
  const results: SyncPreflightResult[] = [];
  const reservedTargetPaths = new Map<string, { skillName: string; ownerId: string }>();

  for (const descriptor of descriptors) {
    const skillName = descriptor.manifest?.name ?? descriptor.directoryName;
    const support = adapter.supports(descriptor, agent);
    const ownerId = descriptor.skillPath;
    if (!support.supported) {
      const reasonCode = SYNC_REASON_CODES.unsupportedSkill;
      results.push(
        withIssueMetadata(
          {
            descriptor,
            supported: false,
            reasonCode,
            reason: support.reason ?? "Unsupported skill",
            riskLevel: getSyncRiskLevel(reasonCode)
          },
          createIssueMetadata(getSyncReasonSuggestion(reasonCode))
        )
      );
      continue;
    }

    const compatibilityIssue = await validateCompatibilityRequirements(descriptor, agent);
    if (compatibilityIssue) {
      results.push(
        withIssueMetadata(
          {
            descriptor,
            supported: false,
            reasonCode: compatibilityIssue.code,
            reason: compatibilityIssue.message,
            riskLevel: getSyncRiskLevel(compatibilityIssue.code)
          },
          createIssueMetadata(getSyncReasonSuggestion(compatibilityIssue.code), compatibilityIssue.details)
        )
      );
      continue;
    }

    const targetPaths = adapter.resolveTargetPaths({ agent, workspaceRoot: paths.root }, descriptor);
    const pathIssue = await validateTargetPath(targetPaths.rootDir);
    const conflictIssue = detectTargetPathConflict(
      targetPaths.skillDir,
      skillName,
      ownerId,
      reservedTargetPaths,
      installState,
      agentName
    );
    if (pathIssue) {
      results.push(
        withIssueMetadata(
          {
            descriptor,
            supported: false,
            reasonCode: pathIssue.code,
            reason: pathIssue.message,
            riskLevel: getSyncRiskLevel(pathIssue.code),
            targetPath: targetPaths.skillDir
          },
          createIssueMetadata(getSyncReasonSuggestion(pathIssue.code), pathIssue.details)
        )
      );
      continue;
    }
    if (conflictIssue) {
      results.push(
        withIssueMetadata(
          {
            descriptor,
            supported: false,
            reasonCode: conflictIssue.code,
            reason: conflictIssue.message,
            riskLevel: getSyncRiskLevel(conflictIssue.code),
            targetPath: targetPaths.skillDir
          },
          createIssueMetadata(getSyncReasonSuggestion(conflictIssue.code), conflictIssue.details)
        )
      );
      continue;
    }

    reservedTargetPaths.set(targetPaths.skillDir, { skillName, ownerId });

    const sourceHash = await computeExpectedInstalledHash(descriptor, agentName);
    const existingInstall = installState.find((record) => record.skillName === skillName && record.agentName === agentName);
    const targetExists = resultTargetExists(targetPaths.skillDir);
    const noChange =
      existingInstall?.status === "installed" &&
      existingInstall.targetPath === targetPaths.skillDir &&
      existingInstall.sourceHash === sourceHash &&
      (await targetExists);

    results.push({
      descriptor,
      supported: true,
      riskLevel: "low",
      targetPath: targetPaths.skillDir,
      sourceHash,
      noChange
    });
  }

  return results;
}

async function resultTargetExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function validateCompatibilityRequirements(
  descriptor: SkillDescriptor,
  agent: AgentDefinition
): Promise<{ code: SyncReasonCode; message: string; details?: SyncIssueDetails } | null> {
  const manifest = descriptor.manifest;
  if (!manifest || !descriptor.entryPath) {
    return {
      code: SYNC_REASON_CODES.skillStructureIncomplete,
      message: "Skill manifest or entry is missing"
    };
  }

  if (!isPathInsideSkill(descriptor.skillPath, descriptor.entryPath)) {
    return {
      code: SYNC_REASON_CODES.entryPathEscape,
      message: `Entry path escapes skill directory: ${manifest.entry}`
    };
  }

  if (agent.syncMode === "transform" && path.extname(descriptor.entryPath).toLowerCase() !== ".md") {
    return {
      code: SYNC_REASON_CODES.transformEntryNotMarkdown,
      message: `Transform adapter requires markdown entry (.md): ${manifest.entry}`
    };
  }

  const resources = manifest.resources ?? [];
  for (const resource of resources) {
    const resolvedResourcePath = path.resolve(descriptor.skillPath, resource);
    if (!isPathInsideSkill(descriptor.skillPath, resolvedResourcePath)) {
      return {
        code: SYNC_REASON_CODES.resourcePathEscape,
        message: `Resource path escapes skill directory: ${resource}`
      };
    }

    try {
      await stat(resolvedResourcePath);
    } catch {
      return {
        code: SYNC_REASON_CODES.resourceNotFound,
        message: `Required resource not found: ${resource}`
      };
    }
  }

  return null;
}

function isPathInsideSkill(skillRoot: string, targetPath: string): boolean {
  const relative = path.relative(skillRoot, targetPath);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function executeSync(
  paths: WorkspacePaths,
  agentName: string,
  options: { dryRun?: boolean; skillName?: string; repairConflicts?: boolean } = {}
): Promise<SyncExecutionSummary | null> {
  const agent = await getAgentDefinition(paths.registryDir, agentName);
  if (!agent) {
    return null;
  }

  const adapter = getAdapter(agent.adapterName);
  if (!adapter) {
    return null;
  }

  let preflight = await runSyncPreflight(paths, agentName, options);
  const summary: SyncExecutionSummary = {
    agentName,
    dryRun: options.dryRun ?? false,
    executionIntent: {
      operation: "write",
      writeIntent: options.dryRun ? "dry_run" : "mutating"
    },
    noOp: false,
    riskLevel: "low",
    repaired: [],
    success: [],
    skipped: [],
    failed: []
  };

  if (options.repairConflicts && options.dryRun) {
    const repairPreview = await autoRepairStaleInstalledStateConflicts(paths, agentName, preflight, options.skillName, false);
    if (repairPreview.length > 0) {
      summary.repaired.push(...repairPreview);
    }
  }

  if (options.repairConflicts && !options.dryRun) {
    const repaired = await autoRepairStaleInstalledStateConflicts(paths, agentName, preflight, options.skillName, true);
    if (repaired.length > 0) {
      summary.repaired.push(...repaired);
      preflight = await runSyncPreflight(paths, agentName, options);
    }
  }

  for (const result of preflight) {
    const skillName = result.descriptor.manifest?.name ?? result.descriptor.directoryName;
    if (options.skillName && skillName !== options.skillName && result.descriptor.directoryName !== options.skillName) {
      continue;
    }
    if (!result.supported) {
      summary.skipped.push(
        withIssueMetadata(
          {
            skillName,
            reasonCode: result.reasonCode ?? SYNC_REASON_CODES.unsupportedSkill,
            reason: result.reason ?? "Unsupported skill",
            riskLevel: result.riskLevel ?? getSyncRiskLevel(result.reasonCode ?? SYNC_REASON_CODES.unsupportedSkill)
          },
          createIssueMetadata(result.suggestion, result.details)
        )
      );
      continue;
    }

    if (result.noChange) {
      const reasonCode = SYNC_REASON_CODES.noSourceChanges;
      summary.skipped.push(
        withIssueMetadata(
          {
            skillName,
            reasonCode,
            reason: "No source changes detected",
            riskLevel: getSyncRiskLevel(reasonCode)
          },
          createIssueMetadata(getSyncReasonSuggestion(reasonCode))
        )
      );
      continue;
    }

    if (options.dryRun) {
      summary.success.push({
        skillName,
        targetPath: result.targetPath ?? "",
        changedFiles: []
      });
      continue;
    }

    try {
      const targetPaths = adapter.resolveTargetPaths({ agent, workspaceRoot: paths.root }, result.descriptor);
      const syncResult = await adapter.sync({
        descriptor: result.descriptor,
        agent,
        targetPaths
      });

      const now = new Date().toISOString();
      const sourceHash = result.sourceHash ?? (await hashSkillDirectory(result.descriptor.skillPath));
      const installRecord: InstallRecord = {
        skillName,
        agentName,
        sourcePath: result.descriptor.skillPath,
        targetPath: syncResult.targetPath,
        version: result.descriptor.manifest?.version ?? "0.0.0-invalid",
        sourceHash,
        installedAt: now,
        lastSyncedAt: now,
        status: "installed",
        syncMode: syncResult.syncMode
      };
      await upsertInstallRecord(paths.stateDir, installRecord);

      const historyRecord: SyncHistoryRecord = {
        id: `${agentName}:${skillName}:${Date.now()}`,
        skillName,
        agentName,
        startedAt: now,
        finishedAt: now,
        result: "success",
        changedFiles: syncResult.changedFiles
      };
      await appendSyncHistory(paths.stateDir, historyRecord);

      summary.success.push({
        skillName,
        targetPath: syncResult.targetPath,
        changedFiles: syncResult.changedFiles
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      const now = new Date().toISOString();
      await appendSyncHistory(paths.stateDir, {
        id: `${agentName}:${skillName}:${Date.now()}`,
        skillName,
        agentName,
        startedAt: now,
        finishedAt: now,
        result: "failed",
        changedFiles: [],
        errorMessage: message
      });
      const reasonCode = SYNC_REASON_CODES.syncExecutionFailed;
      summary.failed.push(
        withIssueMetadata(
          {
            skillName,
            reasonCode,
            reason: message,
            riskLevel: getSyncRiskLevel(reasonCode)
          },
          createIssueMetadata(getSyncReasonSuggestion(reasonCode))
        )
      );
    }
  }

  if (options.skillName && summary.success.length === 0 && summary.skipped.length === 0 && summary.failed.length === 0) {
    const reasonCode = SYNC_REASON_CODES.requestedSkillNotFound;
    summary.failed.push(
      withIssueMetadata(
        {
          skillName: options.skillName,
          reasonCode,
          reason: `Requested skill not found: ${options.skillName}`,
          riskLevel: getSyncRiskLevel(reasonCode)
        },
        createIssueMetadata(getSyncReasonSuggestion(reasonCode))
      )
    );
  }

  summary.riskLevel = maxRiskLevel([
    ...summary.repaired.map((item) => item.riskLevel),
    ...summary.skipped.map((item) => item.riskLevel),
    ...summary.failed.map((item) => item.riskLevel)
  ]);
  summary.noOp =
    summary.failed.length === 0 &&
    summary.success.length === 0 &&
    summary.repaired.length === 0 &&
    summary.skipped.length > 0 &&
    summary.skipped.every((item) => item.reasonCode === SYNC_REASON_CODES.noSourceChanges);

  return summary;
}

async function autoRepairStaleInstalledStateConflicts(
  paths: WorkspacePaths,
  agentName: string,
  preflight: SyncPreflightResult[],
  requestedSkillName?: string,
  apply = false
): Promise<SyncRepairSummary[]> {
  const currentSkillNames = new Set(
    preflight.map((result) => result.descriptor.manifest?.name ?? result.descriptor.directoryName)
  );
  const targetResults = preflight.filter((result) => {
    const resolvedName = result.descriptor.manifest?.name ?? result.descriptor.directoryName;
    if (!requestedSkillName) {
      return true;
    }
    return resolvedName === requestedSkillName || result.descriptor.directoryName === requestedSkillName;
  });

  const repairableConflicts = targetResults.filter(
    (result) =>
      !result.supported &&
      result.reasonCode === SYNC_REASON_CODES.targetPathConflict &&
      result.details?.conflictSource === "installed_state" &&
      Boolean(result.details.conflictingSkillName) &&
      Boolean(result.details.targetPath) &&
      !currentSkillNames.has(result.details.conflictingSkillName ?? "")
  );

  if (repairableConflicts.length === 0) {
    return [];
  }

  const repairs: SyncRepairSummary[] = [];
  for (const conflict of repairableConflicts) {
    const conflictingSkillName = conflict.details?.conflictingSkillName;
    const targetPath = conflict.details?.targetPath;
    if (!conflictingSkillName || !targetPath) {
      continue;
    }

    if (apply) {
      await removeInstallRecords(
        paths.stateDir,
        (record) =>
          record.agentName === agentName &&
          record.skillName === conflictingSkillName &&
          record.targetPath === targetPath
      );
    }

    repairs.push({
      skillName: conflict.descriptor.manifest?.name ?? conflict.descriptor.directoryName,
      targetPath,
      removedInstallFor: conflictingSkillName,
      reason: apply
        ? `Removed stale install-state conflict for '${conflictingSkillName}'`
        : `Would remove stale install-state conflict for '${conflictingSkillName}'`,
      mode: apply ? "performed" : "preview",
      riskLevel: "medium"
    });
  }

  return repairs;
}

function detectTargetPathConflict(
  targetPath: string,
  skillName: string,
  ownerId: string,
  reservedTargetPaths: Map<string, { skillName: string; ownerId: string }>,
  installState: InstallRecord[],
  agentName: string
): { code: SyncReasonCode; message: string; details: SyncIssueDetails } | null {
  const reservedBy = reservedTargetPaths.get(targetPath);
  if (reservedBy && reservedBy.ownerId !== ownerId) {
    return {
      code: SYNC_REASON_CODES.targetPathConflict,
      message: `Target path conflict: ${targetPath} already reserved for '${reservedBy.skillName}'`,
      details: {
        targetPath,
        conflictingSkillName: reservedBy.skillName,
        conflictSource: "current_sync_batch"
      }
    };
  }

  const existingInstall = installState.find(
    (record) => record.agentName === agentName && record.targetPath === targetPath && record.skillName !== skillName
  );
  if (existingInstall) {
    return {
      code: SYNC_REASON_CODES.targetPathConflict,
      message: `Target path conflict: ${targetPath} already used by '${existingInstall.skillName}'`,
      details: {
        targetPath,
        conflictingSkillName: existingInstall.skillName,
        conflictSource: "installed_state"
      }
    };
  }

  return null;
}

async function validateTargetPath(rootDir: string): Promise<{ code: SyncReasonCode; message: string; details?: SyncIssueDetails } | null> {
  try {
    const rootStat = await stat(rootDir);
    if (!rootStat.isDirectory()) {
      return {
        code: SYNC_REASON_CODES.targetRootInvalid,
        message: `Target root is not a directory: ${rootDir}`
      };
    }
    return null;
  } catch {
    try {
      await mkdir(rootDir, { recursive: true });
      return null;
    } catch {
      return {
        code: SYNC_REASON_CODES.targetRootNotWritable,
        message: `Target root is not writable: ${rootDir}`
      };
    }
  }
}
