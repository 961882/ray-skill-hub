import { inspectSkill } from "./inspect.js";
import { executeSync } from "./sync.js";
import type { WorkspacePaths } from "./paths.js";
import { discoverSkills } from "./discovery.js";
import { spawn } from "node:child_process";
import type { CommandIntentMeta } from "../types/commands.js";

export interface RunSkillResult {
  skillName: string;
  agentName: string;
  targetPath: string;
  entryPath: string;
  installStatus: "already-installed" | "synced";
  executionIntent: CommandIntentMeta;
  execRequested: boolean;
  executed: boolean;
  execution?: {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
  };
}

export async function runSkill(
  paths: WorkspacePaths,
  skillName: string,
  agentName: string,
  options: { exec?: boolean } = {}
): Promise<RunSkillResult> {
  const executionIntent: CommandIntentMeta = {
    operation: "write",
    writeIntent: options.exec ? "mutating" : "conditional_mutating"
  };

  const inspection = await inspectSkill(paths, skillName);
  if (!inspection) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  if (!inspection.isValid) {
    throw new Error(`Skill is invalid: ${skillName}`);
  }

  if (!inspection.compatibleAgents.includes(agentName)) {
    throw new Error(`Skill '${skillName}' is not compatible with agent '${agentName}'`);
  }

  const descriptors = await discoverSkills(paths.skillsDir);
  const descriptor = descriptors.find((item) => item.directoryName === skillName || item.manifest?.name === skillName);
  if (!descriptor || !descriptor.manifest) {
    throw new Error(`Skill descriptor not found: ${skillName}`);
  }

  const installed = inspection.installs.find((install) => install.agentName === agentName && install.status === "installed");
  if (installed && inspection.entryPath) {
    const ready: RunSkillResult = {
      skillName: inspection.name,
      agentName,
      targetPath: installed.targetPath,
      entryPath: inspection.entryPath,
      installStatus: "already-installed",
      executionIntent,
      execRequested: options.exec === true,
      executed: false
    };
    if (options.exec) {
      ready.execution = await executeSkillScript(descriptor.skillPath, descriptor.manifest.scripts?.run);
      ready.executed = true;
    }
    return ready;
  }

  const summary = await executeSync(paths, agentName, { skillName });
  if (!summary) {
    throw new Error(`Unknown or unsupported agent: ${agentName}`);
  }

  const success = summary.success.find((item) => item.skillName === inspection.name || item.skillName === skillName);
  if (!success || !inspection.entryPath) {
    const failure = summary.failed.find((item) => item.skillName === inspection.name || item.skillName === skillName);
    const skipped = summary.skipped.find((item) => item.skillName === inspection.name || item.skillName === skillName);
    throw new Error(failure?.reason ?? skipped?.reason ?? `Failed to prepare skill '${skillName}' for '${agentName}'`);
  }

  const ready: RunSkillResult = {
    skillName: inspection.name,
    agentName,
    targetPath: success.targetPath,
    entryPath: inspection.entryPath,
    installStatus: "synced",
    executionIntent,
    execRequested: options.exec === true,
    executed: false
  };
  if (options.exec) {
    ready.execution = await executeSkillScript(descriptor.skillPath, descriptor.manifest.scripts?.run);
    ready.executed = true;
  }
  return ready;
}

async function executeSkillScript(skillPath: string, command: string | undefined): Promise<NonNullable<RunSkillResult["execution"]>> {
  if (!command || command.trim().length === 0) {
    throw new Error("Skill does not define scripts.run; cannot execute with --exec");
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: skillPath,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0) {
        reject(new Error(`scripts.run failed with exit code ${exitCode}: ${stderr || stdout}`));
        return;
      }
      resolve({
        command,
        exitCode,
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd()
      });
    });
  });
}
