import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveWorkspacePaths } from "../core/paths.js";

const cliPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "index.js");

export interface JsonEnvelope {
  contractVersion: string;
  command: string | null;
  status: "success" | "warning" | "error";
  operation: "read" | "write";
  writeIntent: "none" | "dry_run" | "conditional_mutating" | "mutating";
  exitCode: number;
  output: string;
  data: unknown;
}

export async function createWorkspace(prefix = "skill-hub-cli-"): Promise<{ root: string; paths: ReturnType<typeof resolveWorkspacePaths> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  const paths = resolveWorkspacePaths(root);
  await mkdir(paths.skillsDir, { recursive: true });
  await mkdir(paths.registryDir, { recursive: true });
  await mkdir(paths.stateDir, { recursive: true });
  return { root, paths };
}

export async function createSkill(
  skillsDir: string,
  dirName: string,
  compatibleAgents: string[],
  options: {
    tags?: string[];
    triggers?: string[];
    scripts?: Record<string, string>;
  } = {}
): Promise<void> {
  const skillDir = path.join(skillsDir, dirName);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(
      {
        name: dirName,
        version: "0.1.0",
        entry: "SKILL.md",
        tags: options.tags ?? ["cli"],
        triggers: options.triggers ?? ["cli test"],
        compatibleAgents,
        ...(options.scripts ? { scripts: options.scripts } : {})
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(skillDir, "SKILL.md"), `# ${dirName}\n`, "utf8");
}

export async function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });
  });
}

export function parseEnvelope(stdout: string): JsonEnvelope {
  return JSON.parse(stdout) as JsonEnvelope;
}

export function assertEnvelopeBase(payload: JsonEnvelope): void {
  assert.deepEqual(Object.keys(payload).sort(), [
    "command",
    "contractVersion",
    "data",
    "exitCode",
    "operation",
    "output",
    "status",
    "writeIntent"
  ]);
  assert.equal(payload.contractVersion, "v0");
  assert.equal(typeof payload.output, "string");
}

export function assertStatusConsistent(payload: JsonEnvelope): void {
  const expectedStatus = payload.exitCode === 0 ? "success" : payload.exitCode === 1 ? "warning" : "error";
  assert.equal(payload.status, expectedStatus);
}
