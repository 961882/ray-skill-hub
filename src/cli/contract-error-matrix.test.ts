import test from "node:test";
import assert from "node:assert/strict";

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

interface Scenario {
  name: string;
  args: string[];
  expectedCommand: string;
  expectedOperation: JsonEnvelope["operation"];
  expectedWriteIntent: JsonEnvelope["writeIntent"];
  expectedExitCode: number;
  expectDataNull: boolean;
  outputPattern?: RegExp;
  setup?: (context: Awaited<ReturnType<typeof createWorkspace>>) => Promise<void>;
}

test("JSON contract negative matrix stays stable", async () => {
  const scenarios: Scenario[] = [
    {
      name: "inspect missing argument",
      args: ["inspect", "--json"],
      expectedCommand: "inspect",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 2,
      expectDataNull: true,
      outputPattern: /Missing required argument/
    },
    {
      name: "inspect unknown skill",
      args: ["inspect", "ghost-skill", "--json"],
      expectedCommand: "inspect",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 2,
      expectDataNull: true,
      outputPattern: /Skill not found/
    },
    {
      name: "sync missing agent",
      args: ["sync", "--json"],
      expectedCommand: "sync",
      expectedOperation: "write",
      expectedWriteIntent: "mutating",
      expectedExitCode: 2,
      expectDataNull: true,
      outputPattern: /Missing required option/
    },
    {
      name: "sync missing agent with dry-run",
      args: ["sync", "--dry-run", "--json"],
      expectedCommand: "sync",
      expectedOperation: "write",
      expectedWriteIntent: "dry_run",
      expectedExitCode: 2,
      expectDataNull: true,
      outputPattern: /Missing required option/
    },
    {
      name: "sync warning for unsupported skill",
      args: ["sync", "--agent", "codex", "--dry-run", "--json"],
      expectedCommand: "sync",
      expectedOperation: "write",
      expectedWriteIntent: "dry_run",
      expectedExitCode: 1,
      expectDataNull: false,
      outputPattern: /unsupported_skill/,
      setup: async ({ root, paths }) => {
        await saveAgentDefinitions(paths.registryDir, [
          {
            agentName: "codex",
            adapterName: "codex",
            defaultInstallPath: `${root}/targets/codex`,
            syncMode: "copy"
          }
        ]);
        await createSkill(paths.skillsDir, "openclaw-only", ["openclaw"]);
      }
    },
    {
      name: "run missing skill",
      args: ["run", "--json"],
      expectedCommand: "run",
      expectedOperation: "write",
      expectedWriteIntent: "conditional_mutating",
      expectedExitCode: 2,
      expectDataNull: false,
      outputPattern: /Missing required argument/
    },
    {
      name: "run missing agent",
      args: ["run", "runner", "--json"],
      expectedCommand: "run",
      expectedOperation: "write",
      expectedWriteIntent: "conditional_mutating",
      expectedExitCode: 2,
      expectDataNull: false,
      outputPattern: /Missing required option/,
      setup: async ({ paths }) => {
        await createSkill(paths.skillsDir, "runner", ["codex"]);
      }
    },
    {
      name: "run incompatible with --exec",
      args: ["run", "incompatible-skill", "--agent", "codex", "--exec", "--json"],
      expectedCommand: "run",
      expectedOperation: "write",
      expectedWriteIntent: "mutating",
      expectedExitCode: 2,
      expectDataNull: false,
      outputPattern: /not compatible/,
      setup: async ({ root, paths }) => {
        await saveAgentDefinitions(paths.registryDir, [
          {
            agentName: "codex",
            adapterName: "codex",
            defaultInstallPath: `${root}/targets/codex`,
            syncMode: "copy"
          }
        ]);
        await createSkill(paths.skillsDir, "incompatible-skill", ["openclaw"]);
      }
    },
    {
      name: "init-skill missing name",
      args: ["init-skill", "--json"],
      expectedCommand: "init-skill",
      expectedOperation: "write",
      expectedWriteIntent: "mutating",
      expectedExitCode: 2,
      expectDataNull: true,
      outputPattern: /Missing required argument/
    },
    {
      name: "doctor error keeps read contract",
      args: ["doctor", "--json"],
      expectedCommand: "doctor",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 2,
      expectDataNull: false,
      outputPattern: /missing_agent_definition/,
      setup: async ({ paths }) => {
        await createSkill(paths.skillsDir, "doctor-probe", ["codex"]);
      }
    },
    {
      name: "unknown command fallback",
      args: ["mystery-cmd", "--json"],
      expectedCommand: "unknown",
      expectedOperation: "read",
      expectedWriteIntent: "none",
      expectedExitCode: 2,
      expectDataNull: true,
      outputPattern: /Usage: rayskillhub/
    }
  ];

  for (const scenario of scenarios) {
    const context = await createWorkspace("skill-hub-contract-matrix-");
    if (scenario.setup) {
      await scenario.setup(context);
    }

    const result = await runCli(scenario.args, context.root);
    assert.equal(result.exitCode, scenario.expectedExitCode, scenario.name);
    assert.equal(result.stderr, "", scenario.name);

    const payload = parseEnvelope(result.stdout);
    assertEnvelopeBase(payload);
    assertStatusConsistent(payload);
    assert.equal(payload.command, scenario.expectedCommand, scenario.name);
    assert.equal(payload.operation, scenario.expectedOperation, scenario.name);
    assert.equal(payload.writeIntent, scenario.expectedWriteIntent, scenario.name);
    assert.equal(payload.exitCode, scenario.expectedExitCode, scenario.name);
    assert.equal(payload.data === null, scenario.expectDataNull, scenario.name);
    if (scenario.outputPattern) {
      assert.match(payload.output, scenario.outputPattern, scenario.name);
    }
  }
});
