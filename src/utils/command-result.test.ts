import test from "node:test";
import assert from "node:assert/strict";

import { createCommandResult, formatCommandResult } from "./command-result.js";

test("formatCommandResult serializes structured JSON output", () => {
  const result = createCommandResult("plain output", 1, {
    agentName: "codex",
    dryRun: true
  });

  const jsonOutput = formatCommandResult(result, { json: true, command: "sync" });
  const parsed = JSON.parse(jsonOutput) as {
    contractVersion: string;
    command: string;
    status: string;
    operation: string;
    writeIntent: string;
    exitCode: number;
    output: string;
    data: { agentName: string; dryRun: boolean };
  };

  assert.equal(parsed.contractVersion, "v0");
  assert.equal(parsed.command, "sync");
  assert.equal(parsed.status, "warning");
  assert.equal(parsed.operation, "read");
  assert.equal(parsed.writeIntent, "none");
  assert.equal(parsed.exitCode, 1);
  assert.equal(parsed.output, "plain output");
  assert.equal(parsed.data.agentName, "codex");
  assert.equal(parsed.data.dryRun, true);
});
