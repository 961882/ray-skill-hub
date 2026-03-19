import { initSkill } from "../core/init-skill.js";
import type { WorkspacePaths } from "../core/paths.js";
import type { CommandResult } from "../types/commands.js";
import { createCommandResult } from "../utils/command-result.js";
import { EXIT_ERROR, EXIT_SUCCESS } from "../utils/exit-codes.js";

export async function runInitSkillCommand(
  paths: WorkspacePaths,
  skillName: string | undefined,
  options: { agents?: string[]; withRunScript?: boolean } = {}
): Promise<CommandResult<Awaited<ReturnType<typeof initSkill>>>> {
  type InitResult = Awaited<ReturnType<typeof initSkill>>;

  if (!skillName) {
    return createCommandResult<InitResult>("Missing required argument: <name>", EXIT_ERROR, undefined, {
      operation: "write",
      writeIntent: "mutating"
    });
  }

  try {
    const result = await initSkill(paths, skillName, options);
    return createCommandResult(
      [
        `Initialized skill: ${result.skillName}`,
        `path: ${result.skillPath}`,
        `manifest: ${result.manifestPath}`,
        `entry: ${result.entryPath}`
      ].join("\n"),
      EXIT_SUCCESS,
      result,
      { operation: "write", writeIntent: "mutating" }
    );
  } catch (error) {
    return createCommandResult<InitResult>(error instanceof Error ? error.message : "Failed to initialize skill", EXIT_ERROR, undefined, {
      operation: "write",
      writeIntent: "mutating"
    });
  }
}
