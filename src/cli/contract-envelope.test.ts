import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { saveAgentDefinitions } from "../core/agents.js";
import {
  assertEnvelopeBase,
  assertStatusConsistent,
  createSkill,
  createWorkspace,
  parseEnvelope,
  runCli,
  type JsonEnvelope
} from "./test-helpers.js";

test("JSON envelope contract is stable across key commands", async () => {
  const { root, paths } = await createWorkspace("skill-hub-contract-");
  await createSkill(paths.skillsDir, "contract-skill", ["codex"], {
    tags: ["contract"],
    triggers: ["contract"]
  });
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

  const scenarios: Array<{
    args: string[];
    expectedCommand: string;
    expectedOperation: JsonEnvelope["operation"];
    expectedWriteIntent: JsonEnvelope["writeIntent"];
    expectedExitCode: number;
    expectDataNull?: boolean;
  }> = [
    {
      args: ["list", "--json"],
      expectedCommand: "list",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 0,
      expectDataNull: false
    },
    {
      args: ["inspect", "contract-skill", "--json"],
      expectedCommand: "inspect",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 0,
      expectDataNull: false
    },
    {
      args: ["sync", "--agent", "codex", "--dry-run", "--json"],
      expectedCommand: "sync",
      expectedOperation: "write",
      expectedWriteIntent: "dry_run",
      expectedExitCode: 0,
      expectDataNull: false
    },
    {
      args: ["run", "contract-skill", "--agent", "codex", "--json"],
      expectedCommand: "run",
      expectedOperation: "write",
      expectedWriteIntent: "conditional_mutating",
      expectedExitCode: 0,
      expectDataNull: false
    },
    {
      args: ["inspect", "--json"],
      expectedCommand: "inspect",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 2,
      expectDataNull: true
    },
    {
      args: ["sync", "--json"],
      expectedCommand: "sync",
      expectedOperation: "write",
      expectedWriteIntent: "mutating",
      expectedExitCode: 2,
      expectDataNull: true
    },
    {
      args: ["not-a-command", "--json"],
      expectedCommand: "unknown",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 2,
      expectDataNull: true
    }
  ];

  for (const scenario of scenarios) {
    const result = await runCli(scenario.args, root);
    assert.equal(result.exitCode, scenario.expectedExitCode);
    assert.equal(result.stderr, "");

    const payload = parseEnvelope(result.stdout);
    assertEnvelopeBase(payload);
    assertStatusConsistent(payload);
    assert.equal(payload.command, scenario.expectedCommand);
    assert.equal(payload.operation, scenario.expectedOperation);
    assert.equal(payload.writeIntent, scenario.expectedWriteIntent);
    assert.equal(payload.exitCode, scenario.expectedExitCode);
    assert.equal(payload.data === null, scenario.expectDataNull ?? false);
  }
});
