import { discoverSkills } from "./discovery.js";
import { loadInstallState, loadSyncHistory, type SyncHistoryRecord } from "./install-state.js";
import type { WorkspacePaths } from "./paths.js";

export interface SkillInspection {
  name: string;
  directoryName: string;
  skillPath: string;
  manifestPath: string;
  entryPath: string | null;
  version: string | null;
  tags: string[];
  triggers: string[];
  compatibleAgents: string[];
  compatibleCount: number;
  installedCount: number;
  missingAgents: string[];
  missingCount: number;
  hasRunScript: boolean;
  canExec: boolean;
  isValid: boolean;
  issues: string[];
  installs: Array<{
    agentName: string;
    status: string;
    targetPath: string;
    version: string;
  }>;
  recentHistory: SyncHistoryRecord[];
}

export async function inspectSkill(paths: WorkspacePaths, skillName: string): Promise<SkillInspection | null> {
  const [descriptors, installState, syncHistory] = await Promise.all([
    discoverSkills(paths.skillsDir),
    loadInstallState(paths.stateDir),
    loadSyncHistory(paths.stateDir)
  ]);

  const descriptor = descriptors.find(
    (item) => item.directoryName === skillName || item.manifest?.name === skillName
  );

  if (!descriptor) {
    return null;
  }

  const resolvedName = descriptor.manifest?.name ?? descriptor.directoryName;
  const installs = installState
    .filter((install) => install.skillName === resolvedName)
    .map((install) => ({
      agentName: install.agentName,
      status: install.status,
      targetPath: install.targetPath,
      version: install.version
    }));
  const installedAgentNames = new Set(installs.map((install) => install.agentName));
  const compatibleAgents = descriptor.compatibleAgents;
  const missingAgents = compatibleAgents.filter((agentName) => !installedAgentNames.has(agentName));
  const runScript = descriptor.manifest?.scripts?.run;
  const hasRunScript = typeof runScript === "string" && runScript.trim().length > 0;

  return {
    name: resolvedName,
    directoryName: descriptor.directoryName,
    skillPath: descriptor.skillPath,
    manifestPath: descriptor.manifestPath,
    entryPath: descriptor.entryPath,
    version: descriptor.manifest?.version ?? null,
    tags: descriptor.manifest?.tags ?? [],
    triggers: descriptor.manifest?.triggers ?? [],
    compatibleAgents,
    compatibleCount: compatibleAgents.length,
    installedCount: installs.length,
    missingAgents,
    missingCount: missingAgents.length,
    hasRunScript,
    canExec: descriptor.isValid && hasRunScript,
    isValid: descriptor.isValid,
    issues: descriptor.issues.map((issue) => issue.message),
    installs,
    recentHistory: syncHistory.filter((record) => record.skillName === resolvedName).slice(-5)
  };
}
