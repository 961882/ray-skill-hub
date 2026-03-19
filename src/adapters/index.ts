import type { AgentAdapter } from "./base.js";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { CodexAdapter } from "./codex.js";
import { OpenCodeAdapter } from "./opencode.js";
import { OpenClawAdapter } from "./openclaw.js";

const registry = new Map<string, AgentAdapter>([
  ["claude-code", new ClaudeCodeAdapter()],
  ["codex", new CodexAdapter()],
  ["opencode", new OpenCodeAdapter()],
  ["openclaw", new OpenClawAdapter()]
]);

export function getAdapter(adapterName: string): AgentAdapter | null {
  return registry.get(adapterName) ?? null;
}

export function listAdapters(): AgentAdapter[] {
  return Array.from(registry.values());
}
