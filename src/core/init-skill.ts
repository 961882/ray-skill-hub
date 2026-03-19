import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadAgentDefinitions } from "./agents.js";
import type { WorkspacePaths } from "./paths.js";
import type { SkillManifest } from "../types/skill.js";

export interface InitSkillResult {
  skillName: string;
  skillPath: string;
  manifestPath: string;
  entryPath: string;
}

export async function initSkill(
  paths: WorkspacePaths,
  rawName: string,
  options: { agents?: string[]; withRunScript?: boolean } = {}
): Promise<InitSkillResult> {
  const skillName = normalizeSkillName(rawName);
  if (!skillName) {
    throw new Error("Skill name is required");
  }

  const skillPath = path.join(paths.skillsDir, skillName);
  const manifestPath = path.join(skillPath, "manifest.json");
  const entryPath = path.join(skillPath, "SKILL.md");

  try {
    await stat(skillPath);
    throw new Error(`Skill already exists: ${skillName}`);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  await mkdir(skillPath, { recursive: true });

  const manifest = await buildInitialManifest(paths, skillName, options.agents);

  if (options.withRunScript) {
    manifest.scripts = {
      ...(manifest.scripts ?? {}),
      run: "bash ./scripts/run.sh"
    };
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(entryPath, buildInitialSkillMarkdown(skillName, manifest.compatibleAgents), "utf8");

  if (options.withRunScript) {
    const scriptsDir = path.join(skillPath, "scripts");
    const runScriptPath = path.join(scriptsDir, "run.sh");
    await mkdir(scriptsDir, { recursive: true });
    await writeFile(runScriptPath, buildInitialRunScript(skillName), "utf8");
    await chmod(runScriptPath, 0o755);
  }

  return {
    skillName,
    skillPath,
    manifestPath,
    entryPath
  };
}

async function buildInitialManifest(paths: WorkspacePaths, skillName: string, preferredAgents?: string[]): Promise<SkillManifest> {
  const templatePath = path.join(paths.templatesDir, "manifest.json");
  const rawTemplate = await readFile(templatePath, "utf8");
  const template = JSON.parse(rawTemplate) as SkillManifest;
  const agents = await loadAgentDefinitions(paths.registryDir);
  const compatibleAgents =
    preferredAgents && preferredAgents.length > 0
      ? uniqueStrings(preferredAgents)
      : agents.length > 0
      ? agents.map((agent) => agent.agentName)
      : template.compatibleAgents;

  return {
    ...template,
    name: skillName,
    version: "0.1.0",
    entry: "SKILL.md",
    description: typeof template.description === "string" && template.description.trim().length > 0
      ? template.description
      : `Use when the user says ${JSON.stringify(template.triggers[0] ?? "example trigger")}.`,
    tags: uniqueStrings([skillName, ...template.tags]),
    triggers: uniqueStrings([`${humanizeSkillName(skillName)} skill`, ...template.triggers]),
    compatibleAgents
  };
}

function buildInitialRunScript(skillName: string): string {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    `echo \"Running skill scaffold: ${skillName}\"`,
    "echo \"Implement your execution logic in scripts/run.sh\""
  ].join("\n");
}

function buildInitialSkillMarkdown(skillName: string, compatibleAgents: string[]): string {
  return [
    `# ${humanizeSkillName(skillName)}`,
    "",
    `This is the initial scaffold for the \`${skillName}\` skill.`,
    "",
    "- Purpose: describe what this skill should do",
    `- Compatible agents: ${compatibleAgents.join(", ") || "none"}`,
    "",
    "## Usage",
    "",
    "Describe the expected triggers, inputs, and outputs here."
  ].join("\n");
}

function normalizeSkillName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

function humanizeSkillName(input: string): string {
  return input
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}
