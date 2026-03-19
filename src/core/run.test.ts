import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveWorkspacePaths } from "./paths.js";
import { saveAgentDefinitions } from "./agents.js";
import { runSkill } from "./run.js";
import { runRunCommand } from "../commands/run.js";

async function createWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "skill-hub-run-"));
  const paths = resolveWorkspacePaths(root);
  await mkdir(paths.skillsDir, { recursive: true });
  await mkdir(paths.registryDir, { recursive: true });
  await mkdir(paths.stateDir, { recursive: true });
  return paths;
}

async function createSkill(skillsDir: string, dirName: string, compatibleAgents: string[]) {
  const skillDir = path.join(skillsDir, dirName);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(
      {
        name: dirName,
        version: "0.1.0",
        entry: "SKILL.md",
        tags: ["run"],
        triggers: ["run me"],
        compatibleAgents
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(skillDir, "SKILL.md"), `# ${dirName}\n`, "utf8");
}

test("runSkill syncs missing install and returns ready target", async () => {
  const paths = await createWorkspace();
  const codexRoot = path.join(paths.root, "targets", "codex");
  await mkdir(codexRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: codexRoot,
      syncMode: "copy"
    }
  ]);
  await createSkill(paths.skillsDir, "runner-skill", ["codex"]);

  const result = await runSkill(paths, "runner-skill", "codex");
  assert.equal(result.installStatus, "synced");
  assert.equal(result.execRequested, false);
  assert.equal(result.executed, false);
  assert.equal(result.executionIntent.operation, "write");
  assert.equal(result.executionIntent.writeIntent, "conditional_mutating");
  assert.equal(result.targetPath, path.join(codexRoot, "runner-skill"));
});

test("runRunCommand returns error for incompatible agent", async () => {
  const paths = await createWorkspace();
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: path.join(paths.root, "targets", "codex"),
      syncMode: "copy"
    }
  ]);
  await createSkill(paths.skillsDir, "runner-skill", ["openclaw"]);

  const result = await runRunCommand(paths, "runner-skill", "codex");
  assert.equal(result.exitCode, 2);
  assert.match(result.output, /not compatible/);
  assert.equal(result.data?.execRequested, false);
  assert.equal(result.data?.executed, false);
});

test("runRunCommand executes scripts.run when --exec is enabled", async () => {
  const paths = await createWorkspace();
  const codexRoot = path.join(paths.root, "targets", "codex");
  await mkdir(codexRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: codexRoot,
      syncMode: "copy"
    }
  ]);

  const skillDir = path.join(paths.skillsDir, "exec-skill");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(
      {
        name: "exec-skill",
        version: "0.1.0",
        entry: "SKILL.md",
        tags: ["run"],
        triggers: ["run me"],
        compatibleAgents: ["codex"],
        scripts: {
          run: "node -e \"process.stdout.write('RUN_OK')\""
        }
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(skillDir, "SKILL.md"), "# Exec Skill\n", "utf8");

  const result = await runRunCommand(paths, "exec-skill", "codex", { exec: true });
  assert.equal(result.exitCode, 0);
  assert.match(result.output, /executed: yes/);
  assert.match(result.output, /exec_requested: yes/);
  assert.match(result.output, /RUN_OK/);
  assert.equal(result.data?.skillName, "exec-skill");
  assert.equal(result.data?.execRequested, true);
  assert.equal(result.data?.executed, true);
  assert.equal(result.data?.executionIntent.operation, "write");
  assert.equal(result.data?.executionIntent.writeIntent, "mutating");
  assert.equal(result.data?.execution?.stdout, "RUN_OK");
});
