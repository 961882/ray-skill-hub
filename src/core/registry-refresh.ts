import type { WorkspacePaths } from "./paths.js";
import { rebuildRegistryFromSource } from "./registry.js";
import type { RegistryIndex } from "../types/agent.js";

export async function ensureRegistryFresh(paths: WorkspacePaths): Promise<RegistryIndex> {
  return rebuildRegistryFromSource(paths.skillsDir, paths.registryDir);
}
