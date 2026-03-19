export const COMMAND_CONTRACT_VERSION = "v0";

export type CommandOperation = "read" | "write";
export type CommandWriteIntent = "none" | "dry_run" | "conditional_mutating" | "mutating";

export interface CommandIntentMeta {
  operation: CommandOperation;
  writeIntent: CommandWriteIntent;
}

export interface CommandResult<T = unknown> {
  output: string;
  exitCode: number;
  data?: T;
  intent?: CommandIntentMeta;
}
