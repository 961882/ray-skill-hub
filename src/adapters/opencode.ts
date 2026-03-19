import path from "node:path";

import type { AgentAdapter, AdapterContext, AdapterSupportResult, SyncInput, SyncResult, TargetPaths } from "./base.js";
import { syncByCopy } from "./copy-sync.js";
import { expandHome } from "../core/paths.js";
import type { AgentDefinition } from "../types/agent.js";
import type { SkillDescriptor } from "../types/skill.js";

export class OpenCodeAdapter implements AgentAdapter {
  name = "opencode";

  supports(skill: SkillDescriptor, agent: AgentDefinition): AdapterSupportResult {
    if (!skill.isValid || !skill.manifest) {
      return { supported: false, reason: "Skill is invalid and cannot be synced" };
    }
    if (!skill.compatibleAgents.includes(agent.agentName)) {
      return { supported: false, reason: `Skill does not declare compatibility with ${agent.agentName}` };
    }
    return { supported: true };
  }

  resolveTargetPaths(context: AdapterContext, descriptor: SkillDescriptor): TargetPaths {
    const rootDir = expandHome(context.agent.defaultInstallPath);
    return {
      rootDir,
      skillDir: path.join(rootDir, descriptor.manifest?.name ?? descriptor.directoryName)
    };
  }

  async sync(input: SyncInput): Promise<SyncResult> {
    const changedFiles = await syncByCopy(input.descriptor.skillPath, input.targetPaths.skillDir);
    return {
      changedFiles,
      syncMode: input.agent.syncMode,
      targetPath: input.targetPaths.skillDir
    };
  }
}
