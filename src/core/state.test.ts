import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getAgentDefinition, loadAgentDefinitions, saveAgentDefinitions } from "./agents.js";
import {
  appendSyncHistory,
  loadInstallState,
  loadSyncHistory,
  upsertInstallRecord
} from "./install-state.js";
import { rebuildRegistryFromSource } from "./registry.js";

test("agent definitions can be saved and loaded", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "skill-hub-agents-"));
  const registryDir = path.join(tmpRoot, "registry");

  await saveAgentDefinitions(registryDir, [
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

  const agents = await loadAgentDefinitions(registryDir);
  const codex = await getAgentDefinition(registryDir, "codex");

  assert.equal(agents.length, 2);
  assert.equal(codex?.adapterName, "codex");
});

test("install state upsert replaces matching skill-agent pair only", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "skill-hub-state-"));
  const stateDir = path.join(tmpRoot, "state");

  await upsertInstallRecord(stateDir, {
    skillName: "example-skill",
    agentName: "codex",
    sourcePath: "/skills/example-skill",
    targetPath: "/codex/example-skill",
    version: "0.1.0",
    sourceHash: "hash-1",
    installedAt: "2026-03-17T00:00:00.000Z",
    lastSyncedAt: "2026-03-17T00:00:00.000Z",
    status: "installed",
    syncMode: "copy"
  });

  const updated = await upsertInstallRecord(stateDir, {
    skillName: "example-skill",
    agentName: "codex",
    sourcePath: "/skills/example-skill",
    targetPath: "/codex/example-skill",
    version: "0.1.1",
    sourceHash: "hash-2",
    installedAt: "2026-03-17T00:00:00.000Z",
    lastSyncedAt: "2026-03-17T01:00:00.000Z",
    status: "installed",
    syncMode: "copy"
  });

  assert.equal(updated.length, 1);
  assert.equal(updated[0]?.version, "0.1.1");

  const state = await loadInstallState(stateDir);
  assert.equal(state.length, 1);
  assert.equal(state[0]?.sourceHash, "hash-2");
});

test("sync history appends records without affecting previous entries", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "skill-hub-history-"));
  const stateDir = path.join(tmpRoot, "state");

  await appendSyncHistory(stateDir, {
    id: "1",
    skillName: "example-skill",
    agentName: "codex",
    startedAt: "2026-03-17T00:00:00.000Z",
    finishedAt: "2026-03-17T00:00:10.000Z",
    result: "success",
    changedFiles: ["SKILL.md"]
  });
  await appendSyncHistory(stateDir, {
    id: "2",
    skillName: "broken-skill",
    agentName: "openclaw",
    startedAt: "2026-03-17T01:00:00.000Z",
    finishedAt: "2026-03-17T01:00:05.000Z",
    result: "failed",
    changedFiles: [],
    errorMessage: "Entry file not found"
  });

  const history = await loadSyncHistory(stateDir);
  assert.equal(history.length, 2);
  assert.equal(history[1]?.result, "failed");
});

test("registry can be rebuilt from canonical source", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "skill-hub-rebuild-"));
  const skillsDir = path.join(tmpRoot, "skills");
  const registryDir = path.join(tmpRoot, "registry");
  await mkdir(skillsDir, { recursive: true });

  const skillDir = path.join(skillsDir, "example-skill");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "manifest.json"),
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
  await writeFile(path.join(skillDir, "SKILL.md"), "# Example\n", "utf8");

  const registry = await rebuildRegistryFromSource(skillsDir, registryDir);
  const saved = JSON.parse(await readFile(path.join(registryDir, "index.json"), "utf8")) as { skills: Array<{ name: string }> };

  assert.equal(registry.skills.length, 1);
  assert.equal(saved.skills[0]?.name, "example-skill");
});
