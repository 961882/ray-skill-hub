import test from "node:test";
import assert from "node:assert/strict";

import { getCsvOptionValues, getFirstPositionalArg, getOptionValue, hasFlag } from "./args.js";

test("hasFlag detects existing and missing flags", () => {
  const args = ["run", "demo", "--exec", "--json"];
  assert.equal(hasFlag(args, "--exec"), true);
  assert.equal(hasFlag(args, "--dry-run"), false);
});

test("getOptionValue returns value after option", () => {
  const args = ["sync", "--agent", "codex", "--json"];
  assert.equal(getOptionValue(args, "--agent"), "codex");
  assert.equal(getOptionValue(args, "--skill"), undefined);
});

test("getOptionValue ignores missing or flag-like values", () => {
  assert.equal(getOptionValue(["sync", "--agent"], "--agent"), undefined);
  assert.equal(getOptionValue(["sync", "--agent", "--json"], "--agent"), undefined);
});

test("getCsvOptionValues parses comma-separated option", () => {
  const args = ["init-skill", "demo", "--agents", "codex, openclaw , ,opencode"];
  assert.deepEqual(getCsvOptionValues(args, "--agents"), ["codex", "openclaw", "opencode"]);
  assert.equal(getCsvOptionValues(args, "--missing"), undefined);
});

test("getFirstPositionalArg returns first positional without consumed options", () => {
  const args = ["demo-skill", "--agents", "codex,openclaw", "--json"];
  assert.equal(getFirstPositionalArg(args, ["--agents"]), "demo-skill");
});

test("getFirstPositionalArg skips option value for run", () => {
  const args = ["--agent", "codex", "runner-skill", "--exec", "--json"];
  assert.equal(getFirstPositionalArg(args, ["--agent"]), "runner-skill");
});

test("getFirstPositionalArg handles missing option value", () => {
  const args = ["runner-skill", "--agent", "--json"];
  assert.equal(getFirstPositionalArg(args, ["--agent"]), "runner-skill");
});
