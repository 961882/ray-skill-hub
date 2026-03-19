import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveWorkspacePaths } from "./paths.js";
import { saveAgentDefinitions } from "./agents.js";
import { initSkill } from "./init-skill.js";
import { runInitSkillCommand } from "../commands/init-skill.js";

async function createWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "skill-hub-init-"));
  const paths = resolveWorkspacePaths(root);
  await mkdir(paths.skillsDir, { recursive: true });
  await mkdir(paths.registryDir, { recursive: true });
  await mkdir(paths.templatesDir, { recursive: true });
  await writeFile(
    path.join(paths.templatesDir, "manifest.json"),
    JSON.stringify(
      {
        name: "example-skill",
        version: "0.1.0",
        entry: "SKILL.md",
        tags: ["example"],
        triggers: ["example trigger"],
        compatibleAgents: ["codex"]
      },
      null,
      2
    ),
    "utf8"
  );
  return paths;
}

test("initSkill creates manifest and entry files", async () => {
  const paths = await createWorkspace();
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: "~/.codex/skills",
      syncMode: "copy"
    },
    {
      agentName: "openclaw",
      adapterName: "openclaw",
      defaultInstallPath: "~/.openclaw/skills",
      syncMode: "copy"
    }
  ]);

  const result = await initSkill(paths, "My Demo Skill");
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8")) as {
    name: string;
    compatibleAgents: string[];
    description?: string;
  };
  const skillMarkdown = await readFile(result.entryPath, "utf8");

  assert.equal(result.skillName, "my-demo-skill");
  assert.equal(manifest.name, "my-demo-skill");
  assert.equal(manifest.description, 'Use when the user says "example trigger".');
  assert.deepEqual(manifest.compatibleAgents, ["codex", "openclaw"]);
  assert.match(skillMarkdown, /My Demo Skill/);
});

test("runInitSkillCommand returns error when skill already exists", async () => {
  const paths = await createWorkspace();
  await mkdir(path.join(paths.skillsDir, "existing-skill"), { recursive: true });

  const result = await runInitSkillCommand(paths, "existing-skill");
  assert.equal(result.exitCode, 2);
  assert.match(result.output, /Skill already exists/);
  assert.equal(result.data, undefined);
});

test("runInitSkillCommand returns structured data on success", async () => {
  const paths = await createWorkspace();

  const result = await runInitSkillCommand(paths, "json-skill");

  assert.equal(result.exitCode, 0);
  assert.equal(result.data?.skillName, "json-skill");
  assert.match(result.output, /Initialized skill: json-skill/);
});

test("initSkill supports custom agents and run script scaffold", async () => {
  const paths = await createWorkspace();

  const result = await initSkill(paths, "exec-skill", {
    agents: ["opencode", "claude-code"],
    withRunScript: true
  });

  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8")) as {
    compatibleAgents: string[];
    scripts?: { run?: string };
  };
  const runScriptPath = path.join(result.skillPath, "scripts", "run.sh");
  const runScriptContent = await readFile(runScriptPath, "utf8");

  assert.deepEqual(manifest.compatibleAgents, ["opencode", "claude-code"]);
  assert.equal(manifest.scripts?.run, "bash ./scripts/run.sh");
  assert.match(runScriptContent, /Running skill scaffold: exec-skill/);
});
