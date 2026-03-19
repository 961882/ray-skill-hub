#!/usr/bin/env node

import { resolveWorkspacePaths } from "../core/paths.js";
import { runListCommand } from "../commands/list.js";
import { runInspectCommand } from "../commands/inspect.js";
import { runDoctorCommand } from "../commands/doctor.js";
import { runSyncCommand } from "../commands/sync.js";
import { runInitSkillCommand } from "../commands/init-skill.js";
import { runRunCommand } from "../commands/run.js";
import { formatCommandResult } from "../utils/command-result.js";
import { EXIT_ERROR } from "../utils/exit-codes.js";
import { getCsvOptionValues, getFirstPositionalArg, getOptionValue, hasFlag } from "./args.js";

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;
  const paths = resolveWorkspacePaths();
  const json = hasFlag(args, "--json");

  const writeResult = (commandName: string, result: { output: string; exitCode: number; data?: unknown }): void => {
    const stream = json ? process.stdout : result.exitCode === EXIT_ERROR ? process.stderr : process.stdout;
    stream.write(`${formatCommandResult(result, { json, command: commandName })}\n`);
    process.exitCode = result.exitCode;
  };

  switch (command) {
    case "list": {
      const result = await runListCommand(paths);
      writeResult("list", result);
      return;
    }
    case "inspect": {
      const skillName = getFirstPositionalArg(args);
      const result = await runInspectCommand(paths, skillName);
      writeResult("inspect", result);
      return;
    }
    case "doctor": {
      const result = await runDoctorCommand(paths);
      writeResult("doctor", result);
      return;
    }
    case "sync": {
      const agentName = getOptionValue(args, "--agent");
      const skillName = getOptionValue(args, "--skill");
      const dryRun = hasFlag(args, "--dry-run");
      const repairConflicts = hasFlag(args, "--repair-conflicts");
      const syncOptions: { dryRun?: boolean; skillName?: string; repairConflicts?: boolean } = { dryRun };
      if (skillName) {
        syncOptions.skillName = skillName;
      }
      if (repairConflicts) {
        syncOptions.repairConflicts = true;
      }
      const result = await runSyncCommand(paths, agentName, syncOptions);
      writeResult("sync", result);
      return;
    }
    case "init-skill": {
      const agents = getCsvOptionValues(args, "--agents");
      const withRunScript = hasFlag(args, "--with-run-script");
      const skillName = getFirstPositionalArg(args, ["--agents"]);
      const initOptions: { agents?: string[]; withRunScript?: boolean } = {};
      if (agents !== undefined) {
        initOptions.agents = agents;
      }
      if (withRunScript) {
        initOptions.withRunScript = true;
      }
      const result = await runInitSkillCommand(paths, skillName, initOptions);
      writeResult("init-skill", result);
      return;
    }
    case "run": {
      const agentName = getOptionValue(args, "--agent");
      const exec = hasFlag(args, "--exec");
      const skillName = getFirstPositionalArg(args, ["--agent"]);
      const result = await runRunCommand(paths, skillName, agentName, { exec });
      writeResult("run", result);
      return;
    }
    default: {
    writeResult("unknown", { output: "Usage: rayskillhub <list|inspect|doctor|sync|init-skill|run> [args]", exitCode: EXIT_ERROR });
    }
  }
}

void main();
