import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AgentDefinition } from "../types/agent.js";

export async function loadAgentDefinitions(registryDir: string): Promise<AgentDefinition[]> {
  const inputPath = path.join(registryDir, "agents.json");

  try {
    const raw = await readFile(inputPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isAgentDefinition);
  } catch {
    return [];
  }
}

export async function saveAgentDefinitions(registryDir: string, agents: AgentDefinition[]): Promise<string> {
  await mkdir(registryDir, { recursive: true });
  const outputPath = path.join(registryDir, "agents.json");
  await writeFile(outputPath, `${JSON.stringify(agents, null, 2)}\n`, "utf8");
  return outputPath;
}

export async function getAgentDefinition(registryDir: string, agentName: string): Promise<AgentDefinition | null> {
  const agents = await loadAgentDefinitions(registryDir);
  return agents.find((agent) => agent.agentName === agentName) ?? null;
}

function isAgentDefinition(value: unknown): value is AgentDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.agentName === "string" &&
    typeof record.adapterName === "string" &&
    typeof record.defaultInstallPath === "string" &&
    (record.syncMode === "copy" || record.syncMode === "symlink" || record.syncMode === "transform")
  );
}
