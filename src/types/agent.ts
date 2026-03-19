export interface AgentDefinition {
  agentName: string;
  adapterName: string;
  defaultInstallPath: string;
  syncMode: "copy" | "symlink" | "transform";
  supportsTransform?: boolean;
}

export interface RegistrySkillRecord {
  name: string;
  version: string;
  path: string;
  entry: string;
  tags: string[];
  triggers: string[];
  compatibleAgents: string[];
  manifestHash: string;
  isValid: boolean;
}

export interface RegistryIndex {
  generatedAt: string;
  skills: RegistrySkillRecord[];
}
