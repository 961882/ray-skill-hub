import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, lstat, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveWorkspacePaths } from "./paths.js";
import { saveAgentDefinitions } from "./agents.js";
import { executeSync, runSyncPreflight } from "./sync.js";
import { loadInstallState, loadSyncHistory, upsertInstallRecord } from "./install-state.js";
import { runSyncCommand } from "../commands/sync.js";
import { SYNC_REASON_CODES } from "../types/sync.js";

async function createWorkspace(): Promise<ReturnType<typeof resolveWorkspacePaths>> {
  const root = await mkdtemp(path.join(os.tmpdir(), "skill-hub-epic4-"));
  const paths = resolveWorkspacePaths(root);
  await mkdir(paths.skillsDir, { recursive: true });
  await mkdir(paths.registryDir, { recursive: true });
  await mkdir(paths.stateDir, { recursive: true });
  return paths;
}

async function createSkill(
  skillsDir: string,
  dirName: string,
  compatibleAgents: string[],
  options: {
    entry?: string;
    resources?: string[];
  } = {}
): Promise<void> {
  const skillDir = path.join(skillsDir, dirName);
  const entry = options.entry ?? "SKILL.md";
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "manifest.json"),
    JSON.stringify(
      {
        name: dirName,
        version: "0.1.0",
        entry,
        tags: ["sync"],
        triggers: ["sync me"],
        compatibleAgents,
        resources: options.resources
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(skillDir, entry), `# ${dirName}\n`, "utf8");
}

test("runSyncPreflight marks incompatible skills as skipped", async () => {
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
  await createSkill(paths.skillsDir, "codex-skill", ["codex"]);
  await createSkill(paths.skillsDir, "other-skill", ["openclaw"]);

  const results = await runSyncPreflight(paths, "codex");
  assert.equal(results.length, 2);
  assert.equal(results.some((item) => item.supported && item.descriptor.directoryName === "codex-skill"), true);
  assert.equal(results.some((item) => !item.supported && item.descriptor.directoryName === "other-skill"), true);
});

test("executeSync copies codex-compatible skill and writes state/history", async () => {
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
  await createSkill(paths.skillsDir, "codex-skill", ["codex"]);

  const summary = await executeSync(paths, "codex");
  assert.equal(summary?.success.length, 1);

  const targetSkillFile = path.join(codexRoot, "codex-skill", "SKILL.md");
  const content = await readFile(targetSkillFile, "utf8");
  assert.match(content, /^---/);
  assert.match(content, /name: "Codex Skill"/);
  assert.match(content, /description: "Use when the user says \\\"sync me\\\"\."/);
  assert.match(content, /# codex-skill/);

  const installs = await loadInstallState(paths.stateDir);
  const history = await loadSyncHistory(paths.stateDir);
  assert.equal(installs.length, 1);
  assert.equal(history.length, 1);
  assert.equal(history[0]?.result, "success");
});

test("executeSync copies claude-code-compatible skill into user skill directory", async () => {
  const paths = await createWorkspace();
  const claudeRoot = path.join(paths.root, "targets", "claude");
  await mkdir(claudeRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "claude-code",
      adapterName: "claude-code",
      defaultInstallPath: claudeRoot,
      syncMode: "copy"
    }
  ]);
  await createSkill(paths.skillsDir, "claude-skill", ["claude-code"]);

  const summary = await executeSync(paths, "claude-code");
  assert.equal(summary?.success.length, 1);

  const targetSkillFile = path.join(claudeRoot, "claude-skill", "SKILL.md");
  const content = await readFile(targetSkillFile, "utf8");
  assert.match(content, /^---/);
  assert.match(content, /name: "claude-skill"/);
  assert.match(content, /description: "Use when the user says \\\"sync me\\\"\."/);
  assert.match(content, /# claude-skill/);
});

test("executeSync prefers codex description override when generating frontmatter", async () => {
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
  await createSkill(paths.skillsDir, "override-skill", ["codex"]);
  await writeFile(
    path.join(paths.skillsDir, "override-skill", "manifest.json"),
    JSON.stringify(
      {
        name: "override-skill",
        version: "0.1.0",
        entry: "SKILL.md",
        description: "Generic description.",
        tags: ["sync"],
        triggers: ["sync me"],
        compatibleAgents: ["codex"],
        adapterOverrides: {
          codex: {
            description: "Codex-specific description."
          }
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const summary = await executeSync(paths, "codex");
  assert.equal(summary?.success.length, 1);

  const targetSkillFile = path.join(codexRoot, "override-skill", "SKILL.md");
  const content = await readFile(targetSkillFile, "utf8");
  assert.match(content, /description: "Codex-specific description\."/);
});

test("executeSync copies opencode-compatible skill into user skill directory", async () => {
  const paths = await createWorkspace();
  const opencodeRoot = path.join(paths.root, "targets", "opencode");
  await mkdir(opencodeRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "opencode",
      adapterName: "opencode",
      defaultInstallPath: opencodeRoot,
      syncMode: "copy"
    }
  ]);
  await createSkill(paths.skillsDir, "opencode-skill", ["opencode"]);

  const summary = await executeSync(paths, "opencode");
  assert.equal(summary?.success.length, 1);

  const targetSkillFile = path.join(opencodeRoot, "opencode-skill", "SKILL.md");
  const content = await readFile(targetSkillFile, "utf8");
  assert.match(content, /opencode-skill/);
});

test("executeSync copies openclaw-compatible skill into user skill directory", async () => {
  const paths = await createWorkspace();
  const openclawRoot = path.join(paths.root, "targets", "openclaw");
  await mkdir(openclawRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "openclaw",
      adapterName: "openclaw",
      defaultInstallPath: openclawRoot,
      syncMode: "copy"
    }
  ]);
  await createSkill(paths.skillsDir, "openclaw-skill", ["openclaw"]);

  const summary = await executeSync(paths, "openclaw");
  assert.equal(summary?.success.length, 1);

  const targetSkillFile = path.join(openclawRoot, "openclaw-skill", "SKILL.md");
  const content = await readFile(targetSkillFile, "utf8");
  assert.match(content, /^---/);
  assert.match(content, /name: "openclaw-skill"/);
  assert.match(content, /description: "Use when the user says \\\"sync me\\\"\."/);
  assert.match(content, /# openclaw-skill/);
});

test("runSyncCommand rejects unknown agent", async () => {
  const paths = await createWorkspace();
  const result = await runSyncCommand(paths, "missing-agent");
  assert.equal(result.exitCode, 2);
  assert.match(result.output, /Unknown or unsupported agent/);
});

test("executeSync skips unchanged installs after first successful sync", async () => {
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
  await createSkill(paths.skillsDir, "stable-skill", ["codex"]);

  const first = await executeSync(paths, "codex");
  const second = await executeSync(paths, "codex");

  assert.equal(first?.success.length, 1);
  assert.equal(second?.success.length, 0);
  assert.equal(second?.skipped.some((item) => item.reason === "No source changes detected"), true);
  assert.equal(second?.noOp, true);
});

test("runSyncCommand treats no_source_changes-only dry-run as success no-op", async () => {
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
  await createSkill(paths.skillsDir, "stable-skill", ["codex"]);

  const first = await runSyncCommand(paths, "codex");
  const second = await runSyncCommand(paths, "codex", { dryRun: true });

  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  assert.equal(second.data?.noOp, true);
  assert.match(second.output, /no-op: yes/);
  assert.equal(second.data?.skipped.every((item) => item.reasonCode === SYNC_REASON_CODES.noSourceChanges), true);
});

test("runSyncPreflight detects target path conflicts", async () => {
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

  await createSkill(paths.skillsDir, "conflict-a", ["codex"]);
  await createSkill(paths.skillsDir, "conflict-b", ["codex"]);

  await writeFile(
    path.join(paths.skillsDir, "conflict-b", "manifest.json"),
    JSON.stringify(
      {
        name: "conflict-a",
        version: "0.1.0",
        entry: "SKILL.md",
        tags: ["sync"],
        triggers: ["sync me"],
        compatibleAgents: ["codex"]
      },
      null,
      2
    ),
    "utf8"
  );

  const results = await runSyncPreflight(paths, "codex");
  const conflict = results.find((item) => !item.supported && item.reasonCode === SYNC_REASON_CODES.targetPathConflict);
  assert.equal(Boolean(conflict), true);
  assert.match(conflict?.reason ?? "", /Target path conflict/);
  assert.equal(conflict?.details?.targetPath, path.join(codexRoot, "conflict-a"));
  assert.equal(conflict?.details?.conflictingSkillName, "conflict-a");
  assert.equal(conflict?.details?.conflictSource, "current_sync_batch");
  assert.match(conflict?.suggestion ?? "", /修改 skill 名称或清理冲突/);
});

test("runSyncCommand supports dry-run without writing install state", async () => {
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
  await createSkill(paths.skillsDir, "dry-run-skill", ["codex"]);

  const result = await runSyncCommand(paths, "codex", { dryRun: true });
  const installs = await loadInstallState(paths.stateDir);

  assert.equal(result.exitCode, 0);
  assert.match(result.output, /dry-run: yes/);
  assert.equal(result.data?.agentName, "codex");
  assert.equal(result.data?.success[0]?.skillName, "dry-run-skill");
  assert.equal(result.data?.executionIntent.operation, "write");
  assert.equal(result.data?.executionIntent.writeIntent, "dry_run");
  assert.equal(installs.length, 0);
});

test("executeSync reinstalls when target directory is missing even if install state hash matches", async () => {
  const paths = await createWorkspace();
  const claudeRoot = path.join(paths.root, "targets", "claude");
  await mkdir(claudeRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "claude-code",
      adapterName: "claude-code",
      defaultInstallPath: claudeRoot,
      syncMode: "copy"
    }
  ]);
  await createSkill(paths.skillsDir, "restore-skill", ["claude-code"]);

  const first = await executeSync(paths, "claude-code");
  assert.equal(first?.success.length, 1);

  await rm(path.join(claudeRoot, "restore-skill"), { recursive: true, force: true });

  const second = await executeSync(paths, "claude-code");
  assert.equal(second?.success.length, 1);
  assert.equal(second?.skipped.length, 0);
});

test("runSyncCommand supports targeting a single skill", async () => {
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
  await createSkill(paths.skillsDir, "alpha-skill", ["codex"]);
  await createSkill(paths.skillsDir, "beta-skill", ["codex"]);

  const result = await runSyncCommand(paths, "codex", { dryRun: true, skillName: "beta-skill" });

  assert.equal(result.exitCode, 0);
  assert.equal(result.data?.success.length, 1);
  assert.equal(result.data?.success[0]?.skillName, "beta-skill");
  assert.equal(result.data?.executionIntent.writeIntent, "dry_run");
  assert.match(result.output, /beta-skill/);
  assert.doesNotMatch(result.output, /alpha-skill/);
});

test("runSyncCommand returns error when requested skill does not exist", async () => {
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
  await createSkill(paths.skillsDir, "alpha-skill", ["codex"]);

  const result = await runSyncCommand(paths, "codex", { dryRun: true, skillName: "missing-skill" });

  assert.equal(result.exitCode, 2);
  assert.match(result.output, /Requested skill not found: missing-skill/);
  assert.equal(result.data?.failed[0]?.reasonCode, SYNC_REASON_CODES.requestedSkillNotFound);
  assert.equal(result.data?.executionIntent.writeIntent, "dry_run");
  assert.match(result.data?.failed[0]?.suggestion ?? "", /确认 skill 名称存在/);
});

test("runSyncCommand prints actionable suggestion for compatibility skips", async () => {
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

  await createSkill(paths.skillsDir, "missing-resource-skill", ["codex"], {
    resources: ["assets/guide.md"]
  });

  const result = await runSyncCommand(paths, "codex", { dryRun: true });

  assert.equal(result.exitCode, 1);
  assert.match(result.output, /resource_not_found/);
  assert.match(result.output, /suggestion: 补齐缺失资源文件，或从 manifest\.resources 中移除无效声明。/);
});

test("runSyncCommand prints guided conflict details for target path conflicts", async () => {
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

  await createSkill(paths.skillsDir, "conflict-a", ["codex"]);
  await createSkill(paths.skillsDir, "conflict-b", ["codex"]);
  await writeFile(
    path.join(paths.skillsDir, "conflict-b", "manifest.json"),
    JSON.stringify(
      {
        name: "conflict-a",
        version: "0.1.0",
        entry: "SKILL.md",
        tags: ["sync"],
        triggers: ["sync me"],
        compatibleAgents: ["codex"]
      },
      null,
      2
    ),
    "utf8"
  );

  const result = await runSyncCommand(paths, "codex", { dryRun: true });

  assert.equal(result.exitCode, 1);
  assert.match(result.output, /target_path_conflict/);
  assert.match(result.output, /target: .*conflict-a/);
  assert.match(result.output, /conflicts_with: conflict-a/);
  assert.match(result.output, /conflict_source: current_sync_batch/);
});

test("runSyncCommand auto-repairs stale installed-state conflicts when enabled", async () => {
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
  await createSkill(paths.skillsDir, "repair-target", ["codex"]);
  await upsertInstallRecord(paths.stateDir, {
    skillName: "legacy-skill",
    agentName: "codex",
    sourcePath: path.join(paths.skillsDir, "legacy-skill"),
    targetPath: path.join(codexRoot, "repair-target"),
    version: "0.1.0",
    sourceHash: "legacy-hash",
    installedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    status: "installed",
    syncMode: "copy"
  });

  const result = await runSyncCommand(paths, "codex", { skillName: "repair-target", repairConflicts: true });
  const installs = await loadInstallState(paths.stateDir);

  assert.equal(result.exitCode, 0);
  assert.equal(result.data?.repaired.length, 1);
  assert.equal(result.data?.repaired[0]?.removedInstallFor, "legacy-skill");
  assert.equal(result.data?.executionIntent.writeIntent, "mutating");
  assert.equal(result.data?.repaired[0]?.riskLevel, "medium");
  assert.match(result.output, /repaired:/);
  assert.match(result.output, /removed_install_for: legacy-skill/);
  assert.equal(installs.some((record) => record.skillName === "legacy-skill"), false);
  assert.equal(installs.some((record) => record.skillName === "repair-target" && record.agentName === "codex"), true);
});

test("runSyncCommand previews stale installed-state repairs during dry-run", async () => {
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
  await createSkill(paths.skillsDir, "repair-target", ["codex"]);
  await upsertInstallRecord(paths.stateDir, {
    skillName: "legacy-skill",
    agentName: "codex",
    sourcePath: path.join(paths.skillsDir, "legacy-skill"),
    targetPath: path.join(codexRoot, "repair-target"),
    version: "0.1.0",
    sourceHash: "legacy-hash",
    installedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    status: "installed",
    syncMode: "copy"
  });

  const result = await runSyncCommand(paths, "codex", {
    skillName: "repair-target",
    repairConflicts: true,
    dryRun: true
  });
  const installs = await loadInstallState(paths.stateDir);

  assert.equal(result.exitCode, 1);
  assert.equal(result.data?.repaired.length, 1);
  assert.equal(result.data?.repaired[0]?.mode, "preview");
  assert.equal(result.data?.executionIntent.writeIntent, "dry_run");
  assert.equal(result.data?.repaired[0]?.riskLevel, "medium");
  assert.match(result.output, /mode: preview/);
  assert.match(result.output, /Would remove stale install-state conflict/);
  assert.equal(installs.some((record) => record.skillName === "legacy-skill"), true);
});

test("executeSync returns structured suggestion for compatibility skips", async () => {
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

  await createSkill(paths.skillsDir, "missing-resource-skill", ["codex"], {
    resources: ["assets/guide.md"]
  });

  const summary = await executeSync(paths, "codex", { dryRun: true });
  const skipped = summary?.skipped.find((item) => item.skillName === "missing-resource-skill");

  assert.equal(skipped?.reasonCode, SYNC_REASON_CODES.resourceNotFound);
  assert.equal(skipped?.suggestion, "补齐缺失资源文件，或从 manifest.resources 中移除无效声明。");
});

test("runSyncPreflight rejects missing declared resources", async () => {
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

  await createSkill(paths.skillsDir, "missing-resource-skill", ["codex"], {
    resources: ["assets/guide.md"]
  });

  const results = await runSyncPreflight(paths, "codex");
  const target = results.find((item) => item.descriptor.directoryName === "missing-resource-skill");
  assert.equal(target?.supported, false);
  assert.equal(target?.reasonCode, SYNC_REASON_CODES.resourceNotFound);
  assert.equal(target?.suggestion, "补齐缺失资源文件，或从 manifest.resources 中移除无效声明。");
  assert.match(target?.reason ?? "", /Required resource not found/);
});

test("runSyncPreflight rejects resource paths that escape skill directory", async () => {
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

  await createSkill(paths.skillsDir, "escape-resource-skill", ["codex"], {
    resources: ["../outside.md"]
  });

  const results = await runSyncPreflight(paths, "codex");
  const target = results.find((item) => item.descriptor.directoryName === "escape-resource-skill");
  assert.equal(target?.supported, false);
  assert.equal(target?.reasonCode, SYNC_REASON_CODES.resourcePathEscape);
  assert.match(target?.reason ?? "", /Resource path escapes skill directory/);
});

test("runSyncPreflight rejects entry paths that escape skill directory", async () => {
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

  await writeFile(path.join(paths.root, "outside.md"), "# outside\n", "utf8");
  await createSkill(paths.skillsDir, "escape-entry-skill", ["codex"], {
    entry: "../outside.md"
  });

  const results = await runSyncPreflight(paths, "codex");
  const target = results.find((item) => item.descriptor.directoryName === "escape-entry-skill");
  assert.equal(target?.supported, false);
  assert.equal(target?.reasonCode, SYNC_REASON_CODES.entryPathEscape);
  assert.match(target?.reason ?? "", /Entry path escapes skill directory/);
});
