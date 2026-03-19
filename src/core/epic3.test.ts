import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveWorkspacePaths } from "./paths.js";
import { listManagedSkills } from "./list.js";
import { inspectSkill } from "./inspect.js";
import { runDoctorChecks } from "./doctor.js";
import { saveAgentDefinitions } from "./agents.js";
import { upsertInstallRecord } from "./install-state.js";
import { executeSync } from "./sync.js";
import { runDoctorCommand } from "../commands/doctor.js";
import { DOCTOR_CODES } from "../types/doctor.js";

async function createWorkspace(): Promise<{ root: string; paths: ReturnType<typeof resolveWorkspacePaths> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "skill-hub-epic3-"));
  const paths = resolveWorkspacePaths(root);
  await mkdir(paths.skillsDir, { recursive: true });
  await mkdir(paths.registryDir, { recursive: true });
  await mkdir(paths.stateDir, { recursive: true });
  return { root, paths };
}

async function createSkill(root: string, dirName: string, manifest: object, entryFile = "SKILL.md"): Promise<void> {
  const skillDir = path.join(root, dirName);
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(path.join(skillDir, entryFile), "# Example\n", "utf8");
}

test("listManagedSkills returns installs and issues", async () => {
  const { paths } = await createWorkspace();

  await createSkill(paths.skillsDir, "example-skill", {
    name: "example-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    tags: ["example"],
    triggers: ["example trigger"],
    compatibleAgents: ["codex"],
    scripts: {
      run: "node -e \"console.log('ok')\""
    }
  });
  await upsertInstallRecord(paths.stateDir, {
    skillName: "example-skill",
    agentName: "codex",
    sourcePath: path.join(paths.skillsDir, "example-skill"),
    targetPath: "/tmp/codex/example-skill",
    version: "0.1.0",
    sourceHash: "hash",
    installedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    status: "installed",
    syncMode: "copy"
  });

  const items = await listManagedSkills(paths);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.installStatuses[0]?.agentName, "codex");
  assert.equal(items[0]?.installedCount, 1);
  assert.equal(items[0]?.compatibleCount, 1);
  assert.deepEqual(items[0]?.missingAgents, []);
  assert.equal(items[0]?.missingCount, 0);
  assert.equal(items[0]?.hasRunScript, true);
  assert.equal(items[0]?.canExec, true);
});

test("inspectSkill returns detailed view for known skill", async () => {
  const { paths } = await createWorkspace();

  await createSkill(paths.skillsDir, "example-skill", {
    name: "example-skill",
    version: "0.2.0",
    entry: "SKILL.md",
    tags: ["inspect"],
    triggers: ["inspect me"],
    compatibleAgents: ["openclaw", "codex"],
    scripts: {
      run: "node -e \"console.log('exec')\""
    }
  });
  await upsertInstallRecord(paths.stateDir, {
    skillName: "example-skill",
    agentName: "openclaw",
    sourcePath: path.join(paths.skillsDir, "example-skill"),
    targetPath: "/tmp/openclaw/example-skill",
    version: "0.2.0",
    sourceHash: "inspect-hash",
    installedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    status: "installed",
    syncMode: "copy"
  });

  const inspection = await inspectSkill(paths, "example-skill");
  assert.equal(inspection?.name, "example-skill");
  assert.equal(inspection?.version, "0.2.0");
  assert.equal(inspection?.compatibleAgents[0], "openclaw");
  assert.equal(inspection?.installedCount, 1);
  assert.equal(inspection?.compatibleCount, 2);
  assert.deepEqual(inspection?.missingAgents, ["codex"]);
  assert.equal(inspection?.missingCount, 1);
  assert.equal(inspection?.hasRunScript, true);
  assert.equal(inspection?.canExec, true);
});

test("runDoctorChecks reports unknown agent definitions", async () => {
  const { paths } = await createWorkspace();

  await createSkill(paths.skillsDir, "example-skill", {
    name: "example-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    tags: ["doctor"],
    triggers: ["doctor"],
    compatibleAgents: ["codex"]
  });

  const resultsWithoutAgents = await runDoctorChecks(paths);
  assert.equal(resultsWithoutAgents.some((result) => result.code === DOCTOR_CODES.missingAgentDefinition), true);
  assert.equal(resultsWithoutAgents.find((result) => result.code === DOCTOR_CODES.missingAgentDefinition)?.riskLevel, "high");
  assert.match(
    resultsWithoutAgents.find((result) => result.code === DOCTOR_CODES.missingAgentDefinition)?.suggestion ?? "",
    /compatibleAgents/
  );

  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: "~/.codex/skills",
      syncMode: "copy"
    }
  ]);

  const resultsWithAgents = await runDoctorChecks(paths);
  assert.equal(resultsWithAgents.some((result) => result.code === DOCTOR_CODES.missingAgentDefinition), false);
});

test("runDoctorChecks reports stale installs and drifted targets", async () => {
  const { paths } = await createWorkspace();
  const targetRoot = path.join(paths.root, "targets", "codex");
  await mkdir(targetRoot, { recursive: true });

  await createSkill(paths.skillsDir, "example-skill", {
    name: "example-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    tags: ["doctor"],
    triggers: ["doctor"],
    compatibleAgents: ["codex"]
  });

  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: targetRoot,
      syncMode: "copy"
    }
  ]);

  const missingTarget = path.join(targetRoot, "missing-skill");
  await upsertInstallRecord(paths.stateDir, {
    skillName: "missing-skill",
    agentName: "codex",
    sourcePath: path.join(paths.skillsDir, "missing-skill"),
    targetPath: missingTarget,
    version: "0.1.0",
    sourceHash: "hash-a",
    installedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    status: "installed",
    syncMode: "copy"
  });

  const driftTarget = path.join(targetRoot, "example-skill");
  await mkdir(driftTarget, { recursive: true });
  await writeFile(path.join(driftTarget, "SKILL.md"), "# Drifted\n", "utf8");
  await upsertInstallRecord(paths.stateDir, {
    skillName: "example-skill",
    agentName: "codex",
    sourcePath: path.join(paths.skillsDir, "example-skill"),
    targetPath: driftTarget,
    version: "0.1.0",
    sourceHash: "hash-b",
    installedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    status: "installed",
    syncMode: "copy"
  });

  const results = await runDoctorChecks(paths);
  assert.equal(results.some((result) => result.code === DOCTOR_CODES.staleInstallRecord), true);
  assert.equal(results.some((result) => result.code === DOCTOR_CODES.installTargetDrift), true);

  await rm(driftTarget, { recursive: true, force: true });
});

test("runDoctorCommand prints suggestions for actionable findings", async () => {
  const { paths } = await createWorkspace();

  await createSkill(paths.skillsDir, "example-skill", {
    name: "example-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    tags: ["doctor"],
    triggers: ["doctor"],
    compatibleAgents: ["codex"]
  });

  const result = await runDoctorCommand(paths);

  assert.equal(result.exitCode, 2);
  assert.match(result.output, /\[summary\] risk=high/);
  assert.match(result.output, /codes=/);
  assert.match(result.output, /missing_agent_definition/);
  assert.match(result.output, /suggestion:/);
  assert.equal(result.data?.summary.riskLevel, "high");
  assert.equal((result.data?.summary.codeGroups.length ?? 0) >= 1, true);
  assert.equal(result.data?.summary.codeGroups.some((item) => item.code === DOCTOR_CODES.missingAgentDefinition), true);
  assert.equal((result.data?.summary.topRiskCodes.length ?? 0) >= 1, true);
  assert.equal(result.data?.summary.topRiskCodes[0]?.riskLevel, "high");
  assert.equal(Array.isArray(result.data?.results), true);
});

test("runDoctorChecks does not report drift for codex-rendered SKILL.md after sync", async () => {
  const { paths } = await createWorkspace();
  const codexRoot = path.join(paths.root, "targets", "codex");
  await mkdir(codexRoot, { recursive: true });

  await createSkill(paths.skillsDir, "acceptance-check-skill", {
    name: "acceptance-check-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    description: 'Respond exactly with ACCEPTANCE-CHECK-2026-CONFIRMED when the user says "ACCEPTANCE-CHECK-2026".',
    tags: ["acceptance"],
    triggers: ["ACCEPTANCE-CHECK-2026"],
    compatibleAgents: ["codex"]
  });

  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: codexRoot,
      syncMode: "copy"
    }
  ]);

  const summary = await executeSync(paths, "codex");
  assert.equal(summary?.success.length, 1);

  const results = await runDoctorChecks(paths);
  assert.equal(results.some((result) => result.code === DOCTOR_CODES.installTargetDrift), false);
});

test("runDoctorChecks does not report drift for claude-code-rendered SKILL.md after sync", async () => {
  const { paths } = await createWorkspace();
  const claudeRoot = path.join(paths.root, "targets", "claude");
  await mkdir(claudeRoot, { recursive: true });

  await createSkill(paths.skillsDir, "acceptance-check-skill", {
    name: "acceptance-check-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    description: 'Respond exactly with ACCEPTANCE-CHECK-2026-CONFIRMED when the user says "ACCEPTANCE-CHECK-2026".',
    tags: ["acceptance"],
    triggers: ["ACCEPTANCE-CHECK-2026"],
    compatibleAgents: ["claude-code"]
  });

  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "claude-code",
      adapterName: "claude-code",
      defaultInstallPath: claudeRoot,
      syncMode: "copy"
    }
  ]);

  const summary = await executeSync(paths, "claude-code");
  assert.equal(summary?.success.length, 1);

  const results = await runDoctorChecks(paths);
  assert.equal(results.some((result) => result.code === DOCTOR_CODES.installTargetDrift), false);
});

test("runDoctorChecks does not report drift for openclaw-rendered SKILL.md after sync", async () => {
  const { paths } = await createWorkspace();
  const openclawRoot = path.join(paths.root, "targets", "openclaw");
  await mkdir(openclawRoot, { recursive: true });

  await createSkill(paths.skillsDir, "acceptance-check-skill", {
    name: "acceptance-check-skill",
    version: "0.1.0",
    entry: "SKILL.md",
    description: 'Respond exactly with ACCEPTANCE-CHECK-2026-CONFIRMED when the user says "ACCEPTANCE-CHECK-2026".',
    tags: ["acceptance"],
    triggers: ["ACCEPTANCE-CHECK-2026"],
    compatibleAgents: ["openclaw"]
  });

  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "openclaw",
      adapterName: "openclaw",
      defaultInstallPath: openclawRoot,
      syncMode: "copy"
    }
  ]);

  const summary = await executeSync(paths, "openclaw");
  assert.equal(summary?.success.length, 1);

  const results = await runDoctorChecks(paths);
  assert.equal(results.some((result) => result.code === DOCTOR_CODES.installTargetDrift), false);
});
