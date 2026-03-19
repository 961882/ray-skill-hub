import { inspectSkill } from "../core/inspect.js";
import type { WorkspacePaths } from "../core/paths.js";
import type { CommandResult } from "../types/commands.js";
import { ensureRegistryFresh } from "../core/registry-refresh.js";
import { createCommandResult } from "../utils/command-result.js";
import { EXIT_ERROR, EXIT_SUCCESS } from "../utils/exit-codes.js";
import { formatInspectOutput } from "../utils/logger.js";

export async function runInspectCommand(
  paths: WorkspacePaths,
  skillName: string | undefined
): Promise<CommandResult<NonNullable<Awaited<ReturnType<typeof inspectSkill>>>>> {
  type InspectResult = NonNullable<Awaited<ReturnType<typeof inspectSkill>>>;

  if (!skillName) {
    return createCommandResult<InspectResult>("Missing required argument: <skill>", EXIT_ERROR, undefined, {
      operation: "read",
      writeIntent: "none"
    });
  }

  await ensureRegistryFresh(paths);
  const result = await inspectSkill(paths, skillName);
  if (!result) {
    return createCommandResult<InspectResult>(`Skill not found: ${skillName}`, EXIT_ERROR, undefined, {
      operation: "read",
      writeIntent: "none"
    });
  }

  return createCommandResult(formatInspectOutput(result), EXIT_SUCCESS, result, { operation: "read", writeIntent: "none" });
}
