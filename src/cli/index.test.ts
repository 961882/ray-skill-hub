import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { saveAgentDefinitions } from "../core/agents.js";
import { createSkill, createWorkspace, runCli } from "./test-helpers.js";

function assertIntentMirror(
  payload: {
    operation: string;
    writeIntent: string;
    data: { executionIntent?: { operation: string; writeIntent: string } };
  }
): void {
  assert.equal(payload.data.executionIntent?.operation, payload.operation);
  assert.equal(payload.data.executionIntent?.writeIntent, payload.writeIntent);
}

test("CLI list --json writes structured output to stdout", async () => {
  const { root, paths } = await createWorkspace();
  await createSkill(paths.skillsDir, "json-list-skill", ["codex"]);

  const result = await runCli(["list", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    contractVersion: string;
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    output: string;
    data: Array<{ name: string; hasRunScript: boolean; canExec: boolean }>;
  };

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.contractVersion, "v0");
  assert.equal(payload.command, "list");
  assert.equal(payload.status, "success");
  assert.equal(payload.operation, "read");
  assert.equal(payload.writeIntent, "none");
  assert.equal(payload.exitCode, 0);
  assert.match(payload.output, /json-list-skill@0.1.0/);
  assert.equal(payload.data[0]?.name, "json-list-skill");
  assert.equal(payload.data[0]?.hasRunScript, false);
  assert.equal(payload.data[0]?.canExec, false);
});

test("CLI doctor --json returns error payload on stdout", async () => {
  const { root, paths } = await createWorkspace();
  await createSkill(paths.skillsDir, "json-doctor-skill", ["codex"]);

  const result = await runCli(["doctor", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    contractVersion: string;
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    output: string;
    data: {
      summary: {
        riskLevel: string;
        issueCounts: { error: number; warning: number; info: number };
        codeGroups: Array<{ code: string; count: number; highestSeverity: string; riskLevel: string }>;
        topRiskCodes: Array<{ code: string; count: number; highestSeverity: string; riskLevel: string }>;
      };
      results: Array<{ code: string; suggestion?: string; riskLevel: string }>;
    };
  };

  assert.equal(result.exitCode, 2);
  assert.equal(result.stderr, "");
  assert.equal(payload.contractVersion, "v0");
  assert.equal(payload.command, "doctor");
  assert.equal(payload.status, "error");
  assert.equal(payload.operation, "read");
  assert.equal(payload.writeIntent, "none");
  assert.equal(payload.exitCode, 2);
  assert.equal(payload.data.summary.riskLevel, "high");
  assert.equal(payload.data.summary.issueCounts.error >= 1, true);
  assert.equal(payload.data.summary.codeGroups.length >= 1, true);
  assert.equal((payload.data.summary.codeGroups[0]?.count ?? 0) >= 1, true);
  assert.equal(payload.data.summary.topRiskCodes.length >= 1, true);
  assert.equal(payload.data.summary.topRiskCodes[0]?.riskLevel, "high");
  assert.equal(payload.data.summary.topRiskCodes.length <= 3, true);
  assert.equal(
    payload.data.summary.topRiskCodes.every((topItem) => payload.data.summary.codeGroups.some((group) => group.code === topItem.code)),
    true
  );
  for (let index = 1; index < payload.data.summary.topRiskCodes.length; index += 1) {
    const previous = payload.data.summary.topRiskCodes[index - 1];
    const current = payload.data.summary.topRiskCodes[index];
    const previousRank = previous?.riskLevel === "high" ? 3 : previous?.riskLevel === "medium" ? 2 : 1;
    const currentRank = current?.riskLevel === "high" ? 3 : current?.riskLevel === "medium" ? 2 : 1;
    assert.equal((previousRank ?? 0) >= (currentRank ?? 0), true);
  }
  assert.match(payload.output, /missing_agent_definition/);
  assert.equal(payload.data.results.some((item) => item.code === "missing_agent_definition"), true);
  assert.equal(payload.data.results.find((item) => item.code === "missing_agent_definition")?.riskLevel, "high");
  assert.match(payload.data.results.find((item) => item.code === "missing_agent_definition")?.suggestion ?? "", /compatibleAgents/);
});

test("CLI sync --json returns structured targeted dry-run payload", async () => {
  const { root, paths } = await createWorkspace();
  const codexRoot = path.join(root, "targets", "codex");
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

  const result = await runCli(["sync", "--agent", "codex", "--skill", "beta-skill", "--dry-run", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    contractVersion: string;
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    data: {
      agentName: string;
      dryRun: boolean;
      noOp: boolean;
      executionIntent: { operation: string; writeIntent: string };
      riskLevel: string;
      success: Array<{ skillName: string }>;
      skipped: unknown[];
      failed: unknown[];
    };
  };

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.contractVersion, "v0");
  assert.equal(payload.command, "sync");
  assert.equal(payload.status, "success");
  assert.equal(payload.operation, "write");
  assert.equal(payload.writeIntent, "dry_run");
  assert.equal(payload.exitCode, 0);
  assert.equal(payload.data.agentName, "codex");
  assert.equal(payload.data.dryRun, true);
  assert.equal(payload.data.noOp, false);
  assert.equal(payload.data.executionIntent.operation, "write");
  assert.equal(payload.data.executionIntent.writeIntent, "dry_run");
  assertIntentMirror(payload);
  assert.equal(payload.data.riskLevel, "low");
  assert.equal(payload.data.success.length, 1);
  assert.equal(payload.data.success[0]?.skillName, "beta-skill");
  assert.equal(payload.data.skipped.length, 0);
  assert.equal(payload.data.failed.length, 0);
});

test("CLI inspect --json returns structured skill details", async () => {
  const { root, paths } = await createWorkspace();
  await createSkill(paths.skillsDir, "json-inspect-skill", ["codex", "opencode"]);

  const result = await runCli(["inspect", "json-inspect-skill", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    contractVersion: string;
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    data: {
      name: string;
      compatibleAgents: string[];
      compatibleCount: number;
      installedCount: number;
      missingAgents: string[];
      missingCount: number;
      hasRunScript: boolean;
      canExec: boolean;
      issues: string[];
      installs: unknown[];
    };
  };

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.contractVersion, "v0");
  assert.equal(payload.command, "inspect");
  assert.equal(payload.status, "success");
  assert.equal(payload.operation, "read");
  assert.equal(payload.writeIntent, "none");
  assert.equal(payload.data.name, "json-inspect-skill");
  assert.deepEqual(payload.data.compatibleAgents, ["codex", "opencode"]);
  assert.equal(payload.data.compatibleCount, 2);
  assert.equal(payload.data.installedCount, 0);
  assert.deepEqual(payload.data.missingAgents, ["codex", "opencode"]);
  assert.equal(payload.data.missingCount, 2);
  assert.equal(payload.data.hasRunScript, false);
  assert.equal(payload.data.canExec, false);
  assert.deepEqual(payload.data.issues, []);
  assert.equal(payload.data.installs.length, 0);
});

test("CLI run --json returns structured execution details", async () => {
  const { root, paths } = await createWorkspace();
  const codexRoot = path.join(root, "targets", "codex");
  await mkdir(codexRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: codexRoot,
      syncMode: "copy"
    }
  ]);

  await createSkill(paths.skillsDir, "json-run-skill", ["codex"], {
    triggers: ["cli run"],
    scripts: {
      run: "node -e \"process.stdout.write('JSON_RUN_OK')\""
    }
  });

  const result = await runCli(["run", "json-run-skill", "--agent", "codex", "--exec", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    contractVersion: string;
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    data: {
      skillName: string;
      agentName: string;
      installStatus: string;
      execRequested: boolean;
      executed: boolean;
      executionIntent: { operation: string; writeIntent: string };
      execution?: {
        command: string;
        exitCode: number;
        stdout: string;
        stderr: string;
      };
    };
  };

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.contractVersion, "v0");
  assert.equal(payload.command, "run");
  assert.equal(payload.status, "success");
  assert.equal(payload.operation, "write");
  assert.equal(payload.writeIntent, "mutating");
  assert.equal(payload.data.skillName, "json-run-skill");
  assert.equal(payload.data.agentName, "codex");
  assert.equal(payload.data.execRequested, true);
  assert.equal(payload.data.executed, true);
  assert.equal(payload.data.executionIntent.operation, "write");
  assert.equal(payload.data.executionIntent.writeIntent, "mutating");
  assertIntentMirror(payload);
  assert.match(payload.data.installStatus, /already-installed|synced/);
  assert.match(payload.data.execution?.command ?? "", /process\.stdout\.write/);
  assert.equal(payload.data.execution?.exitCode, 0);
  assert.equal(payload.data.execution?.stdout, "JSON_RUN_OK");
  assert.equal(payload.data.execution?.stderr, "");
});

test("CLI run --json without --exec keeps conditional_mutating intent", async () => {
  const { root, paths } = await createWorkspace();
  const codexRoot = path.join(root, "targets", "codex");
  await mkdir(codexRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: codexRoot,
      syncMode: "copy"
    }
  ]);
  await createSkill(paths.skillsDir, "json-run-no-exec", ["codex"]);

  const result = await runCli(["run", "json-run-no-exec", "--agent", "codex", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    operation: string;
    writeIntent: string;
    exitCode: number;
    status: string;
    data: {
      execRequested: boolean;
      executed: boolean;
      executionIntent: { operation: string; writeIntent: string };
      execution?: unknown;
      installStatus: string;
    };
  };

  assert.equal(result.exitCode, 0);
  assert.equal(payload.status, "success");
  assert.equal(payload.operation, "write");
  assert.equal(payload.writeIntent, "conditional_mutating");
  assertIntentMirror(payload);
  assert.equal(payload.data.execRequested, false);
  assert.equal(payload.data.executed, false);
  assert.match(payload.data.installStatus, /already-installed|synced/);
  assert.equal(payload.data.execution, undefined);
});

test("CLI run --exec failure keeps JSON envelope stable", async () => {
  const { root, paths } = await createWorkspace();
  const codexRoot = path.join(root, "targets", "codex");
  await mkdir(codexRoot, { recursive: true });
  await saveAgentDefinitions(paths.registryDir, [
    {
      agentName: "codex",
      adapterName: "codex",
      defaultInstallPath: codexRoot,
      syncMode: "copy"
    }
  ]);

  await createSkill(paths.skillsDir, "json-run-fail", ["codex"], {
    triggers: ["cli run fail"],
    scripts: {
      run: "node -e \"process.stderr.write('JSON_RUN_FAIL'); process.exit(1)\""
    }
  });

  const result = await runCli(["run", "json-run-fail", "--agent", "codex", "--exec", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    contractVersion: string;
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    output: string;
    data: {
      skillName: string;
      agentName: string;
      executionIntent: { operation: string; writeIntent: string };
      execRequested: boolean;
      executed: boolean;
      error: string;
    };
  };

  assert.equal(result.exitCode, 2);
  assert.equal(result.stderr, "");
  assert.equal(payload.contractVersion, "v0");
  assert.equal(payload.command, "run");
  assert.equal(payload.status, "error");
  assert.equal(payload.operation, "write");
  assert.equal(payload.writeIntent, "mutating");
  assert.equal(payload.exitCode, 2);
  assert.match(payload.output, /scripts\.run failed with exit code 1/);
  assert.equal(payload.data.execRequested, true);
  assert.equal(payload.data.executed, false);
  assert.equal(payload.data.skillName, "json-run-fail");
  assert.equal(payload.data.agentName, "codex");
  assert.equal(payload.data.executionIntent.writeIntent, "mutating");
  assert.match(payload.data.error, /scripts\.run failed with exit code 1/);
});

test("CLI sync without --agent keeps write contract in JSON errors", async () => {
  const { root } = await createWorkspace();

  const result = await runCli(["sync", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    data: null;
  };

  assert.equal(result.exitCode, 2);
  assert.equal(payload.command, "sync");
  assert.equal(payload.status, "error");
  assert.equal(payload.operation, "write");
  assert.equal(payload.writeIntent, "mutating");
  assert.equal(payload.exitCode, 2);
  assert.equal(payload.data, null);
});

test("CLI inspect missing argument keeps read contract in JSON errors", async () => {
  const { root } = await createWorkspace();

  const result = await runCli(["inspect", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    data: null;
  };

  assert.equal(result.exitCode, 2);
  assert.equal(payload.command, "inspect");
  assert.equal(payload.status, "error");
  assert.equal(payload.operation, "read");
  assert.equal(payload.writeIntent, "none");
  assert.equal(payload.exitCode, 2);
  assert.equal(payload.data, null);
});

test("CLI unknown command in --json keeps fallback envelope", async () => {
  const { root } = await createWorkspace();

  const result = await runCli(["not-a-command", "--json"], root);
  const payload = JSON.parse(result.stdout) as {
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    output: string;
    data: null;
  };

  assert.equal(result.exitCode, 2);
  assert.equal(payload.command, "unknown");
  assert.equal(payload.status, "error");
  assert.equal(payload.operation, "read");
  assert.equal(payload.writeIntent, "none");
  assert.equal(payload.exitCode, 2);
  assert.match(payload.output, /Usage: rayskillhub/);
  assert.equal(payload.data, null);
});
