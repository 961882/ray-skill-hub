import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveWorkspacePaths } from "./paths.js";
import { runListCommand } from "../commands/list.js";

test("runListCommand refreshes registry automatically before listing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "skill-hub-registry-refresh-"));
  const paths = resolveWorkspacePaths(root);
  await mkdir(paths.skillsDir, { recursive: true });
  await mkdir(paths.registryDir, { recursive: true });

  const skillDir = path.join(paths.skillsDir, "fresh-skill");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(
      {
        name: "fresh-skill",
        version: "0.1.0",
        entry: "SKILL.md",
        tags: ["fresh"],
        triggers: ["fresh trigger"],
        compatibleAgents: ["codex"]
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(skillDir, "SKILL.md"), "# Fresh Skill\n", "utf8");

  const result = await runListCommand(paths);
  const registryRaw = await readFile(path.join(paths.registryDir, "index.json"), "utf8");
  const registry = JSON.parse(registryRaw) as { skills: Array<{ name: string }> };

  assert.match(result.output, /fresh-skill@0.1.0/);
  assert.match(result.output, /installed: 0\/1/);
  assert.match(result.output, /missing: codex/);
  assert.equal(Array.isArray(result.data), true);
  assert.equal(result.data?.[0]?.name, "fresh-skill");
  assert.equal(result.data?.[0]?.installedCount, 0);
  assert.equal(result.data?.[0]?.compatibleCount, 1);
  assert.deepEqual(result.data?.[0]?.missingAgents, ["codex"]);
  assert.equal(result.data?.[0]?.missingCount, 1);
  assert.equal(registry.skills[0]?.name, "fresh-skill");
});
