import { executeSync } from "../core/sync.js";
import type { WorkspacePaths } from "../core/paths.js";
import type { CommandResult } from "../types/commands.js";
import type { SyncExecutionSummary } from "../types/sync.js";
import { ensureRegistryFresh } from "../core/registry-refresh.js";
import { createCommandResult } from "../utils/command-result.js";
import { EXIT_ERROR, EXIT_SUCCESS, EXIT_WARNING } from "../utils/exit-codes.js";

function formatSyncOutput(summary: SyncExecutionSummary): string {
  const lines: string[] = [`agent: ${summary.agentName}`, `dry-run: ${summary.dryRun ? "yes" : "no"}`, `no-op: ${summary.noOp ? "yes" : "no"}`];

  if (summary.repaired.length > 0) {
    lines.push("repaired:");
    for (const item of summary.repaired) {
      lines.push(`- ${item.skillName} -> ${item.targetPath}`);
      lines.push(`  mode: ${item.mode} | risk: ${item.riskLevel}`);
      lines.push(`  removed_install_for: ${item.removedInstallFor}`);
      lines.push(`  reason: ${item.reason}`);
    }
  }

  if (summary.success.length > 0) {
    lines.push("success:");
    for (const item of summary.success) {
      lines.push(`- ${item.skillName} -> ${item.targetPath} (${item.changedFiles.length} changed)`);
      if (item.changedFiles.length > 0) {
        for (const changedFile of item.changedFiles) {
          lines.push(`  - ${changedFile}`);
        }
      } else {
        lines.push("  - (dry-run preview or no file-level diff available)");
      }
    }
  }

  if (summary.skipped.length > 0) {
    lines.push("skipped:");
    const skippedByReason = new Map<string, { reason: string; skills: string[] }>();
    for (const item of summary.skipped) {
      const existing = skippedByReason.get(item.reasonCode) ?? { reason: item.reason, skills: [] };
      existing.skills.push(item.skillName);
      skippedByReason.set(item.reasonCode, existing);
    }
    for (const [reasonCode, grouped] of skippedByReason) {
      lines.push(`- ${reasonCode}: ${grouped.reason} (${grouped.skills.length})`);
      const suggestion = summary.skipped.find((item) => item.reasonCode === reasonCode)?.suggestion;
      if (suggestion) {
        lines.push(`  suggestion: ${suggestion}`);
      }
      for (const skillName of grouped.skills) {
        const item = summary.skipped.find((entry) => entry.skillName === skillName && entry.reasonCode === reasonCode);
        lines.push(`  - ${skillName}`);
        if (item?.riskLevel) {
          lines.push(`    risk: ${item.riskLevel}`);
        }
        if (item?.details?.targetPath) {
          lines.push(`    target: ${item.details.targetPath}`);
        }
        if (item?.details?.conflictingSkillName) {
          lines.push(`    conflicts_with: ${item.details.conflictingSkillName}`);
        }
        if (item?.details?.conflictSource) {
          lines.push(`    conflict_source: ${item.details.conflictSource}`);
        }
      }
    }
  }

  if (summary.failed.length > 0) {
    lines.push("failed:");
    for (const item of summary.failed) {
      lines.push(`- ${item.skillName} [${item.reasonCode} | risk=${item.riskLevel}]: ${item.reason}`);
      if (item.suggestion) {
        lines.push(`  suggestion: ${item.suggestion}`);
      }
    }
  }

  return lines.join("\n");
}

export async function runSyncCommand(
  paths: WorkspacePaths,
  agentName: string | undefined,
  options: { dryRun?: boolean; skillName?: string; repairConflicts?: boolean } = {}
): Promise<CommandResult<SyncExecutionSummary>> {
  if (!agentName) {
    return createCommandResult<SyncExecutionSummary>("Missing required option: --agent <agent>", EXIT_ERROR, undefined, {
      operation: "write",
      writeIntent: options.dryRun ? "dry_run" : "mutating"
    });
  }

  await ensureRegistryFresh(paths);
  const summary = await executeSync(paths, agentName, options);
  if (!summary) {
    return createCommandResult<SyncExecutionSummary>(`Unknown or unsupported agent: ${agentName}`, EXIT_ERROR, undefined, {
      operation: "write",
      writeIntent: options.dryRun ? "dry_run" : "mutating"
    });
  }

  const exitCode = summary.failed.length > 0 ? EXIT_ERROR : summary.noOp ? EXIT_SUCCESS : summary.skipped.length > 0 ? EXIT_WARNING : EXIT_SUCCESS;
  return createCommandResult(formatSyncOutput(summary), exitCode, summary, {
    operation: "write",
    writeIntent: options.dryRun ? "dry_run" : "mutating"
  });
}
