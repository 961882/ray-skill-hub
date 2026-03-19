import type { AgentDefinition } from "../types/agent.js";
import type { SkillDescriptor } from "../types/skill.js";

export interface AdapterSupportResult {
  supported: boolean;
  reason?: string;
}

export interface TargetPaths {
  rootDir: string;
  skillDir: string;
}

export interface AdapterContext {
  agent: AgentDefinition;
  workspaceRoot: string;
}

export interface SyncInput {
  descriptor: SkillDescriptor;
  agent: AgentDefinition;
  targetPaths: TargetPaths;
}

export interface SyncResult {
  changedFiles: string[];
  syncMode: AgentDefinition["syncMode"];
  targetPath: string;
}

export interface AgentAdapter {
  name: string;
  supports(skill: SkillDescriptor, agent: AgentDefinition): AdapterSupportResult;
  resolveTargetPaths(context: AdapterContext, descriptor: SkillDescriptor): TargetPaths;
  sync(input: SyncInput): Promise<SyncResult>;
}
