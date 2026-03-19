import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { discoverSkills } from "./discovery.js";
import { buildRegistryIndex } from "./registry.js";

async function createSkill(root: string, name: string, manifest: object, entryContent = "# Skill\n") {
  const skillDir = path.join(root, name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const entry = (manifest as { entry?: string }).entry;
  if (typeof entry === "string") {
    await writeFile(path.join(skillDir, entry), entryContent, "utf8");
  }
}

test("discoverSkills returns valid descriptors for legal skills", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "skill-hub-"));
  const skillsDir = path.join(tmpRoot, "skills");
  await mkdir(skillsDir, { recursive: true });

  await createSkill(skillsDir, "example-skill", {
    name: "example-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    tags: ["example"],
    triggers: ["example trigger"],
    compatibleAgents: ["codex"]
  });

  const descriptors = await discoverSkills(skillsDir);
  assert.equal(descriptors.length, 1);
  assert.equal(descriptors[0]?.isValid, true);
  assert.equal(descriptors[0]?.manifest?.name, "example-skill");
});

test("discoverSkills reports invalid entry paths", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "skill-hub-"));
  const skillsDir = path.join(tmpRoot, "skills");
  await mkdir(skillsDir, { recursive: true });

  const skillDir = path.join(skillsDir, "broken-skill");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(
      {
        name: "broken-skill",
        version: "0.1.0",
        entry: "MISSING.md",
        tags: ["broken"],
        triggers: ["broken trigger"],
        compatibleAgents: ["openclaw"]
      },
      null,
      2
    ),
    "utf8"
  );

  const descriptors = await discoverSkills(skillsDir);
  assert.equal(descriptors.length, 1);
  assert.equal(descriptors[0]?.isValid, false);
  assert.equal(descriptors[0]?.issues[0]?.code, "entry_not_found");
});

test("buildRegistryIndex preserves invalid skills for visibility", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "skill-hub-"));
  const skillsDir = path.join(tmpRoot, "skills");
  await mkdir(skillsDir, { recursive: true });

  await createSkill(skillsDir, "valid-skill", {
    name: "valid-skill",
    version: "1.0.0",
    entry: "SKILL.md",
    tags: ["valid"],
    triggers: ["valid trigger"],
    compatibleAgents: ["codex", "openclaw"]
  });

  const brokenDir = path.join(skillsDir, "broken-skill");
  await mkdir(brokenDir, { recursive: true });
  await writeFile(path.join(brokenDir, "manifest.json"), "{}", "utf8");

  const descriptors = await discoverSkills(skillsDir);
  const registry = buildRegistryIndex(descriptors);

  assert.equal(registry.skills.length, 2);
  assert.equal(registry.skills.some((skill) => skill.isValid), true);
  assert.equal(registry.skills.some((skill) => !skill.isValid), true);
});
