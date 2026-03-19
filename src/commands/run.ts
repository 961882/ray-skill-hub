import { runSkill } from "../core/run.js";
import type { WorkspacePaths } from "../core/paths.js";
import type { CommandResult } from "../types/commands.js";
import { ensureRegistryFresh } from "../core/registry-refresh.js";
import { createCommandResult } from "../utils/command-result.js";
import { EXIT_ERROR, EXIT_SUCCESS } from "../utils/exit-codes.js";

export interface RunCommandErrorData {
  skillName?: string;
  agentName?: string;
  executionIntent: {
    operation: "write";
    writeIntent: "conditional_mutating" | "mutating";
  };
  execRequested: boolean;
  executed: false;
  error: string;
}

export async function runRunCommand(
  paths: WorkspacePaths,
  skillName: string | undefined,
  agentName: string | undefined,
  options: { exec?: boolean } = {}
): Promise<CommandResult<Awaited<ReturnType<typeof runSkill>> | RunCommandErrorData>> {
  type RunResult = Awaited<ReturnType<typeof runSkill>>;
  const executionIntent = {
    operation: "write" as const,
    writeIntent: (options.exec ? "mutating" : "conditional_mutating") as "conditional_mutating" | "mutating"
  };

  if (!skillName) {
    const message = "Missing required argument: <skill>";
    return createCommandResult<RunResult | RunCommandErrorData>(message, EXIT_ERROR, {
      executionIntent,
      execRequested: options.exec === true,
      executed: false,
      error: message,
      ...(agentName ? { agentName } : {})
    }, {
      operation: "write",
      writeIntent: "conditional_mutating"
    });
  }

  if (!agentName) {
    const message = "Missing required option: --agent <agent>";
    return createCommandResult<RunResult | RunCommandErrorData>(message, EXIT_ERROR, {
      skillName,
      executionIntent,
      execRequested: options.exec === true,
      executed: false,
      error: message
    }, {
      operation: "write",
      writeIntent: "conditional_mutating"
    });
  }

  try {
    await ensureRegistryFresh(paths);
    const result = await runSkill(paths, skillName, agentName, options);
    const executionLines = result.execution
      ? [
          "executed: yes",
          `command: ${result.execution.command}`,
          `exec_exit: ${result.execution.exitCode}`,
          `exec_stdout: ${result.execution.stdout || "(empty)"}`,
          `exec_stderr: ${result.execution.stderr || "(empty)"}`
        ]
      : ["executed: no"];
    return createCommandResult(
      [
        `skill: ${result.skillName}`,
        `agent: ${result.agentName}`,
        `status: ${result.installStatus}`,
        `target: ${result.targetPath}`,
        `entry: ${result.entryPath}`,
        "ready: yes",
        `exec_requested: ${result.execRequested ? "yes" : "no"}`,
        ...executionLines
      ].join("\n"),
      EXIT_SUCCESS,
      result,
      executionIntent
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run skill";
    return createCommandResult<RunResult | RunCommandErrorData>(message, EXIT_ERROR, {
      skillName,
      agentName,
      executionIntent,
      execRequested: options.exec === true,
      executed: false,
      error: message
    }, executionIntent);
  }
}
