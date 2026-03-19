import type { ManagedSkillListItem } from "../core/list.js";
import type { SkillInspection } from "../core/inspect.js";
import type { DoctorReport } from "../types/doctor.js";

export function formatListOutput(items: ManagedSkillListItem[]): string {
  if (items.length === 0) {
    return "No managed skills found.";
  }

  return items
    .map((item) => {
      const validity = item.isValid ? "valid" : "invalid";
      const installs = item.installStatuses.length > 0
        ? item.installStatuses.map((status) => `${status.agentName}:${status.status}`).join(", ")
        : "not installed";
      const coverage = `${item.installedCount}/${item.compatibleCount}`;
      const missing = item.missingCount > 0 ? ` | missing: ${item.missingAgents.join(", ")}` : "";
      const issues = item.issues.length > 0 ? ` | issues: ${item.issues.join("; ")}` : "";
      const exec = ` | exec: ${item.canExec ? "ready" : item.hasRunScript ? "blocked" : "none"}`;
      return `${item.name}@${item.version} | ${validity} | installed: ${coverage} | agents: ${item.compatibleAgents.join(", ") || "none"} | installs: ${installs}${exec}${missing}${issues}`;
    })
    .join("\n");
}

export function formatInspectOutput(result: SkillInspection): string {
  const issues = result.issues.length > 0 ? result.issues.join("; ") : "none";
  const installs = result.installs.length > 0
    ? result.installs.map((install) => `${install.agentName}:${install.status}@${install.targetPath}`).join("\n")
    : "none";
  const coverage = `${result.installedCount}/${result.compatibleCount}`;
  const missing = result.missingCount > 0 ? result.missingAgents.join(", ") : "none";
  const history = result.recentHistory.length > 0
    ? result.recentHistory.map((record) => `${record.finishedAt} ${record.agentName} ${record.result}`).join("\n")
    : "none";

  return [
    `name: ${result.name}`,
    `directory: ${result.directoryName}`,
    `path: ${result.skillPath}`,
    `manifest: ${result.manifestPath}`,
    `entry: ${result.entryPath ?? "none"}`,
    `version: ${result.version ?? "unknown"}`,
    `tags: ${result.tags.join(", ") || "none"}`,
    `triggers: ${result.triggers.join(", ") || "none"}`,
    `compatible agents: ${result.compatibleAgents.join(", ") || "none"}`,
    `installed coverage: ${coverage}`,
    `missing agents: ${missing}`,
    `has run script: ${result.hasRunScript ? "yes" : "no"}`,
    `can exec: ${result.canExec ? "yes" : "no"}`,
    `valid: ${result.isValid ? "yes" : "no"}`,
    `issues: ${issues}`,
    `installs:\n${installs}`,
    `recent history:\n${history}`
  ].join("\n");
}

export function formatDoctorOutput(report: DoctorReport): string {
  const { summary, results } = report;
  const header = `[summary] risk=${summary.riskLevel} skills=${summary.discoveredSkills} agents=${summary.configuredAgents} installs=${summary.installRecordCount} history=${summary.historyRecordCount} issues=${summary.issueCounts.error}/${summary.issueCounts.warning}/${summary.issueCounts.info}`;
  const groupedCodes = summary.codeGroups.length > 0
    ? `codes=${summary.codeGroups.map((item) => `${item.code}:${item.count}`).join(",")}`
    : "codes=none";
  const topRiskCodes = summary.topRiskCodes.length > 0
    ? `top=${summary.topRiskCodes.map((item) => `${item.code}:${item.riskLevel}:${item.count}`).join(",")}`
    : "top=none";

  if (results.length === 0) {
    return `${header} ${groupedCodes} ${topRiskCodes}\nDoctor found no issues.`;
  }

  return [
    `${header} ${groupedCodes} ${topRiskCodes}`,
    ...results.map((result) => {
      const lines = [`[${result.severity}] ${result.code} (${result.riskLevel}): ${result.message}`];
      if (result.suggestion) {
        lines.push(`  suggestion: ${result.suggestion}`);
      }
      return lines.join("\n");
    })
  ].join("\n");
}
