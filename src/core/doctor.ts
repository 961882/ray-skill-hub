import { lstat, readFile, readlink, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { buildClaudeCodeSkillDocument } from "../adapters/claude-code.js";
import { discoverSkills } from "./discovery.js";
import { loadAgentDefinitions } from "./agents.js";
import { loadInstallState, loadSyncHistory } from "./install-state.js";
import type { WorkspacePaths } from "./paths.js";
import { buildCodexSkillDocument } from "../adapters/codex.js";
import { buildOpenClawSkillDocument } from "../adapters/openclaw.js";
import { hashSkillDirectory } from "../utils/hash.js";
import {
  DOCTOR_CODES,
  type DoctorCheckResult,
  type DoctorCode,
  type DoctorCodeGroup,
  type DoctorReport,
  type DoctorSummary
} from "../types/doctor.js";
import { maxRiskLevel, type RiskLevel } from "../types/risk.js";

export function getDoctorSuggestion(code: DoctorCode): string | undefined {
  switch (code) {
    case DOCTOR_CODES.skillsDirMissing:
    case DOCTOR_CODES.registryDirMissing:
    case DOCTOR_CODES.stateDirMissing:
      return "补齐缺失目录后再重新运行 doctor。";
    case DOCTOR_CODES.agentConfigMissing:
      return "先补充 registry/agents.json 中的 agent 定义。";
    case DOCTOR_CODES.duplicateSkillName:
      return "为重复 skill 重新命名，确保 manifest.name 全局唯一。";
    case DOCTOR_CODES.missingAgentDefinition:
      return "补齐缺失的 agent 定义，或从 compatibleAgents 中移除无效项。";
    case DOCTOR_CODES.targetPathConflict:
      return "调整 skill 名称或安装目录，避免多个 skill 落到同一 target path。";
    case DOCTOR_CODES.staleInstallRecord:
      return "恢复对应 source skill，或清理失效的 install state 记录。";
    case DOCTOR_CODES.brokenSymlinkInstall:
      return "重新执行 sync，或手动把目标恢复为指向 source 的软链接。";
    case DOCTOR_CODES.staleSymlinkTarget:
      return "重新执行 sync，修复软链接漂移。";
    case DOCTOR_CODES.installTargetInvalid:
      return "删除异常 target 后重新执行 sync，让 adapter 重建正确结构。";
    case DOCTOR_CODES.installTargetDrift:
      return "如果漂移不是预期修改，请重新执行 sync 覆盖安装目标。";
    case DOCTOR_CODES.missingInstallTarget:
      return "重新执行 sync 重建缺失 target，或清理失效安装记录。";
    default:
      return undefined;
  }
}

export function getDoctorRiskLevel(code: DoctorCode, severity: DoctorCheckResult["severity"]): RiskLevel {
  if (code === DOCTOR_CODES.doctorSummary) {
    return "low";
  }
  if (severity === "warning") {
    return "medium";
  }
  if (severity === "error") {
    return "high";
  }
  return "low";
}

function withDoctorSuggestion(result: DoctorCheckResult): DoctorCheckResult {
  const suggestion = getDoctorSuggestion(result.code);
  const riskLevel = getDoctorRiskLevel(result.code, result.severity);

  return {
    ...result,
    riskLevel,
    ...(suggestion ? { suggestion } : {})
  };
}

export async function runDoctorReport(paths: WorkspacePaths): Promise<DoctorReport> {
  const results: DoctorCheckResult[] = [];

  await checkDirectory(paths.skillsDir, DOCTOR_CODES.skillsDirMissing, results);
  await checkDirectory(paths.registryDir, DOCTOR_CODES.registryDirMissing, results);
  await checkDirectory(paths.stateDir, DOCTOR_CODES.stateDirMissing, results);

  const [descriptors, agents, installState, syncHistory] = await Promise.all([
    discoverSkills(paths.skillsDir),
    loadAgentDefinitions(paths.registryDir),
    loadInstallState(paths.stateDir),
    loadSyncHistory(paths.stateDir)
  ]);

  if (agents.length === 0) {
    results.push(
      withDoctorSuggestion({
        severity: "warning",
        code: DOCTOR_CODES.agentConfigMissing,
        message: "No agent definitions found in registry/agents.json",
        riskLevel: "medium"
      })
    );
  }

  for (const descriptor of descriptors) {
    for (const issue of descriptor.issues) {
      const result: DoctorCheckResult = {
        severity: descriptor.isValid ? "warning" : "error",
        code: issue.code,
        message: `${descriptor.directoryName}: ${issue.message}`,
        riskLevel: descriptor.isValid ? "medium" : "high"
      };
      if (issue.path !== undefined) {
        result.path = issue.path;
      }
      results.push(withDoctorSuggestion(result));
    }
  }

  const validDescriptors = descriptors.filter((descriptor) => descriptor.isValid && descriptor.manifest);
  const seenNames = new Map<string, string>();
  const seenTargetPaths = new Map<string, string>();
  const descriptorByName = new Map(
    validDescriptors
      .filter((descriptor) => descriptor.manifest)
      .map((descriptor) => [descriptor.manifest?.name ?? descriptor.directoryName, descriptor])
  );

  for (const descriptor of validDescriptors) {
    const manifest = descriptor.manifest;
    if (!manifest) {
      continue;
    }

    const previousPath = seenNames.get(manifest.name);
    if (previousPath) {
      results.push(
        withDoctorSuggestion({
          severity: "error",
          code: DOCTOR_CODES.duplicateSkillName,
          message: `Duplicate skill name '${manifest.name}' found in ${previousPath} and ${descriptor.skillPath}`,
          riskLevel: "high"
        })
      );
    } else {
      seenNames.set(manifest.name, descriptor.skillPath);
    }

    for (const agentName of manifest.compatibleAgents) {
      const agent = agents.find((item) => item.agentName === agentName);
      if (!agent) {
        results.push(
          withDoctorSuggestion({
            severity: "error",
            code: DOCTOR_CODES.missingAgentDefinition,
            message: `Skill '${manifest.name}' references unknown agent '${agentName}'`,
            riskLevel: "high"
          })
        );
        continue;
      }

      const targetPath = path.join(expandHome(agent.defaultInstallPath), manifest.name);
      const key = `${agentName}:${targetPath}`;
      const owner = seenTargetPaths.get(key);
      if (owner && owner !== manifest.name) {
        results.push(
          withDoctorSuggestion({
            severity: "error",
            code: DOCTOR_CODES.targetPathConflict,
            message: `Target path conflict for agent '${agentName}' at ${targetPath}`,
            riskLevel: "high",
            path: targetPath
          })
        );
      } else {
        seenTargetPaths.set(key, manifest.name);
      }
    }
  }

  for (const install of installState) {
    const descriptor = descriptorByName.get(install.skillName);
    if (!descriptor) {
      results.push(
        withDoctorSuggestion({
          severity: "warning",
          code: DOCTOR_CODES.staleInstallRecord,
          message: `Install record exists for missing source skill '${install.skillName}'`,
          riskLevel: "medium",
          path: install.targetPath
        })
      );
      continue;
    }

      const targetIssue = await inspectInstalledTarget(descriptor.manifest!, descriptor.entryPath, descriptor.skillPath, install);
    if (targetIssue) {
      results.push(targetIssue);
    }
  }

  const summary = buildDoctorSummary(descriptors.length, agents.length, installState.length, syncHistory.length, results);
  return { summary, results };
}

export async function runDoctorChecks(paths: WorkspacePaths): Promise<DoctorCheckResult[]> {
  const report = await runDoctorReport(paths);
  return report.results;
}

function buildDoctorSummary(
  discoveredSkills: number,
  configuredAgents: number,
  installRecordCount: number,
  historyRecordCount: number,
  results: DoctorCheckResult[]
): DoctorSummary {
  const issueCounts = {
    info: results.filter((result) => result.severity === "info").length,
    warning: results.filter((result) => result.severity === "warning").length,
    error: results.filter((result) => result.severity === "error").length
  };
  const codeGroups = buildDoctorCodeGroups(results);
  const topRiskCodes = [...codeGroups].sort(compareDoctorCodeGroupRisk).slice(0, 3);

  return {
    discoveredSkills,
    configuredAgents,
    installRecordCount,
    historyRecordCount,
    issueCounts,
    codeGroups,
    topRiskCodes,
    riskLevel: maxRiskLevel(results.map((result) => result.riskLevel))
  };
}

function buildDoctorCodeGroups(results: DoctorCheckResult[]): DoctorCodeGroup[] {
  const grouped = new Map<DoctorCode, DoctorCodeGroup>();

  for (const result of results) {
    const existing = grouped.get(result.code);
    if (!existing) {
      grouped.set(result.code, {
        code: result.code,
        count: 1,
        highestSeverity: result.severity,
        riskLevel: result.riskLevel
      });
      continue;
    }

    existing.count += 1;
    if (compareSeverity(result.severity, existing.highestSeverity) > 0) {
      existing.highestSeverity = result.severity;
    }
    existing.riskLevel = maxRiskLevel([existing.riskLevel, result.riskLevel]);
  }

  return [...grouped.values()].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.code.localeCompare(b.code);
  });
}

function compareSeverity(left: DoctorCheckResult["severity"], right: DoctorCheckResult["severity"]): number {
  return severityWeight(left) - severityWeight(right);
}

function compareDoctorCodeGroupRisk(left: DoctorCodeGroup, right: DoctorCodeGroup): number {
  const riskDiff = riskWeight(right.riskLevel) - riskWeight(left.riskLevel);
  if (riskDiff !== 0) {
    return riskDiff;
  }
  const countDiff = right.count - left.count;
  if (countDiff !== 0) {
    return countDiff;
  }
  const severityDiff = severityWeight(right.highestSeverity) - severityWeight(left.highestSeverity);
  if (severityDiff !== 0) {
    return severityDiff;
  }
  return left.code.localeCompare(right.code);
}

function riskWeight(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function severityWeight(severity: DoctorCheckResult["severity"]): number {
  switch (severity) {
    case "error":
      return 3;
    case "warning":
      return 2;
    default:
      return 1;
  }
}

async function inspectInstalledTarget(
  manifest: NonNullable<Awaited<ReturnType<typeof discoverSkills>>[number]["manifest"]>,
  sourceEntryPath: string | null,
  sourcePath: string,
  install: Awaited<ReturnType<typeof loadInstallState>>[number]
): Promise<DoctorCheckResult | null> {
  try {
    const targetStats = await lstat(install.targetPath);

    if (install.syncMode === "symlink") {
      if (!targetStats.isSymbolicLink()) {
        return withDoctorSuggestion({
          severity: "error",
          code: DOCTOR_CODES.brokenSymlinkInstall,
          message: `Expected symlink install for '${install.skillName}' but found non-symlink target`,
          riskLevel: "high",
          path: install.targetPath
        });
      }

      const linkTarget = await readlink(install.targetPath);
      const resolvedLink = path.resolve(path.dirname(install.targetPath), linkTarget);
      const resolvedSource = await realpath(sourcePath);

      if (resolvedLink !== resolvedSource) {
        return withDoctorSuggestion({
          severity: "error",
          code: DOCTOR_CODES.staleSymlinkTarget,
          message: `Symlink target drift detected for '${install.skillName}'`,
          riskLevel: "high",
          path: install.targetPath
        });
      }

      return null;
    }

    if (install.syncMode === "transform") {
      if (!targetStats.isFile()) {
        return withDoctorSuggestion({
          severity: "error",
          code: DOCTOR_CODES.installTargetInvalid,
          message: `Install target is not a file for transformed skill '${install.skillName}'`,
          riskLevel: "high",
          path: install.targetPath
        });
      }

      return null;
    }

    if (!targetStats.isDirectory()) {
      return withDoctorSuggestion({
        severity: "error",
        code: DOCTOR_CODES.installTargetInvalid,
        message: `Install target is not a directory for '${install.skillName}'`,
        riskLevel: "high",
        path: install.targetPath
      });
    }

    const sourceHashPromise =
      (install.agentName === "codex" || install.agentName === "claude-code" || install.agentName === "openclaw") && sourceEntryPath
        ? readFile(sourceEntryPath, "utf8").then((sourceContent) => {
            const renderedEntry =
              install.agentName === "codex"
                ? buildCodexSkillDocument(manifest, sourceContent)
                : install.agentName === "claude-code"
                  ? buildClaudeCodeSkillDocument(manifest, sourceContent)
                  : buildOpenClawSkillDocument(manifest, sourceContent);

            return hashSkillDirectory(sourcePath, {
              overrides: {
                [manifest.entry]: renderedEntry
              }
            });
          })
        : hashSkillDirectory(sourcePath);

    const [sourceHash, targetHash] = await Promise.all([sourceHashPromise, hashSkillDirectory(install.targetPath)]);

    if (targetHash !== sourceHash) {
      return withDoctorSuggestion({
        severity: "warning",
        code: DOCTOR_CODES.installTargetDrift,
        message: `Installed target content drift detected for '${install.skillName}'`,
        riskLevel: "medium",
        path: install.targetPath
      });
    }

    return null;
  } catch {
    return withDoctorSuggestion({
      severity: "error",
      code: DOCTOR_CODES.missingInstallTarget,
      message: `Install target is missing for '${install.skillName}'`,
      riskLevel: "high",
      path: install.targetPath
    });
  }
}

async function checkDirectory(dirPath: string, code: DoctorCode, results: DoctorCheckResult[]): Promise<void> {
  try {
    const dirStat = await stat(dirPath);
    if (!dirStat.isDirectory()) {
      results.push(
        withDoctorSuggestion({
          severity: "error",
          code,
          message: `Expected directory but found non-directory at ${dirPath}`,
          riskLevel: "high",
          path: dirPath
        })
      );
    }
  } catch {
    results.push(
      withDoctorSuggestion({
        severity: "error",
        code,
        message: `Missing expected directory: ${dirPath}`,
        riskLevel: "high",
        path: dirPath
      })
    );
  }
}

function expandHome(inputPath: string): string {
  if (!inputPath.startsWith("~/")) {
    return inputPath;
  }
  const home = process.env.HOME ?? "~";
  return path.join(home, inputPath.slice(2));
}
