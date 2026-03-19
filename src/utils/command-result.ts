import { COMMAND_CONTRACT_VERSION, type CommandIntentMeta, type CommandResult } from "../types/commands.js";
import { EXIT_ERROR, EXIT_SUCCESS, EXIT_WARNING } from "./exit-codes.js";

const DEFAULT_COMMAND_INTENT: CommandIntentMeta = {
  operation: "read",
  writeIntent: "none"
};

export function createCommandResult<T>(
  output: string,
  exitCode: number,
  data?: T,
  intent: CommandIntentMeta = DEFAULT_COMMAND_INTENT
): CommandResult<T> {
  const base: CommandResult<T> = { output, exitCode, intent };
  return data === undefined ? base : { ...base, data };
}

export function formatCommandResult(result: CommandResult, options: { json?: boolean; command?: string } = {}): string {
  if (!options.json) {
    return result.output;
  }

  const status = result.exitCode === EXIT_SUCCESS ? "success" : result.exitCode === EXIT_WARNING ? "warning" : "error";
  return JSON.stringify(
    {
      contractVersion: COMMAND_CONTRACT_VERSION,
      command: options.command ?? null,
      status,
      operation: result.intent?.operation ?? DEFAULT_COMMAND_INTENT.operation,
      writeIntent: result.intent?.writeIntent ?? DEFAULT_COMMAND_INTENT.writeIntent,
      exitCode: result.exitCode,
      output: result.output,
      data: result.data ?? null
    },
    null,
    2
  );
}
