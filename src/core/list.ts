import type { InstallRecord } from "./install-state.js";
import type { SkillDescriptor } from "../types/skill.js";
import type { RegistrySkillRecord } from "../types/agent.js";
import { discoverSkills } from "./discovery.js";
import { loadInstallState } from "./install-state.js";
import { buildRegistryIndex } from "./registry.js";
import type { WorkspacePaths } from "./paths.js";

export interface ManagedSkillListItem {
  name: string;
  version: string;
  path: string;
  compatibleAgents: string[];
  compatibleCount: number;
  installedCount: number;
  missingAgents: string[];
  missingCount: number;
  hasRunScript: boolean;
  canExec: boolean;
  issues: string[];
  isValid: boolean;
  installStatuses: Array<{
    agentName: string;
    status: InstallRecord["status"];
    targetPath: string;
  }>;
}

export async function listManagedSkills(paths: WorkspacePaths): Promise<ManagedSkillListItem[]> {
  const [descriptors, installState] = await Promise.all([
    discoverSkills(paths.skillsDir),
    loadInstallState(paths.stateDir)
  ]);

  const registry = buildRegistryIndex(descriptors);
  const installsBySkill = groupInstallsBySkill(installState);

  return registry.skills.map((skill) => toManagedSkillListItem(skill, descriptors, installsBySkill));
}

function groupInstallsBySkill(records: InstallRecord[]): Map<string, InstallRecord[]> {
  const grouped = new Map<string, InstallRecord[]>();
  for (const record of records) {
    const existing = grouped.get(record.skillName) ?? [];
    existing.push(record);
    grouped.set(record.skillName, existing);
  }
  return grouped;
}

function toManagedSkillListItem(
  skill: RegistrySkillRecord,
  descriptors: SkillDescriptor[],
  installsBySkill: Map<string, InstallRecord[]>
): ManagedSkillListItem {
  const descriptor = descriptors.find((item) => item.manifest?.name === skill.name || item.directoryName === skill.name);
  const installs = installsBySkill.get(skill.name) ?? [];
  const installStatuses = installs.map((install) => ({
    agentName: install.agentName,
    status: install.status,
    targetPath: install.targetPath
  }));
  const installedAgentNames = new Set(installStatuses.map((install) => install.agentName));
  const missingAgents = skill.compatibleAgents.filter((agentName) => !installedAgentNames.has(agentName));
  const runScript = descriptor?.manifest?.scripts?.run;
  const hasRunScript = typeof runScript === "string" && runScript.trim().length > 0;

  return {
    name: skill.name,
    version: skill.version,
    path: skill.path,
    compatibleAgents: skill.compatibleAgents,
    compatibleCount: skill.compatibleAgents.length,
    installedCount: installStatuses.length,
    missingAgents,
    missingCount: missingAgents.length,
    hasRunScript,
    canExec: skill.isValid && hasRunScript,
    isValid: skill.isValid,
    issues: descriptor?.issues.map((issue) => issue.message) ?? [],
    installStatuses
  };
}
