import { listManagedSkills } from "../core/list.js";
import type { WorkspacePaths } from "../core/paths.js";
import type { CommandResult } from "../types/commands.js";
import { ensureRegistryFresh } from "../core/registry-refresh.js";
import { createCommandResult } from "../utils/command-result.js";
import { EXIT_SUCCESS } from "../utils/exit-codes.js";
import { formatListOutput } from "../utils/logger.js";

export async function runListCommand(paths: WorkspacePaths): Promise<CommandResult<Awaited<ReturnType<typeof listManagedSkills>>>> {
  await ensureRegistryFresh(paths);
  const items = await listManagedSkills(paths);
  return createCommandResult(formatListOutput(items), EXIT_SUCCESS, items, { operation: "read", writeIntent: "none" });
}
