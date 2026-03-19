import type { SkillManifest } from "../types/skill.js";

function yamlQuote(value: string): string {
  return JSON.stringify(value.replace(/\r?\n+/g, " ").trim());
}

export function toDisplayName(skillName: string): string {
  return skillName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveSkillDescription(manifest: SkillManifest, adapterName?: string): string {
  const override = adapterName ? manifest.adapterOverrides?.[adapterName]?.description : undefined;
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }
  if (typeof manifest.description === "string" && manifest.description.trim().length > 0) {
    return manifest.description.trim();
  }
  const firstTrigger = manifest.triggers[0];
  if (firstTrigger) {
    return `Use when the user says ${JSON.stringify(firstTrigger)}.`;
  }
  return `Use for tasks related to ${manifest.name}.`;
}

export function buildFrontmatterSkillDocument(options: {
  name: string;
  description: string;
  sourceContent: string;
}): string {
  const frontmatter = [
    "---",
    `name: ${yamlQuote(options.name)}`,
    `description: ${yamlQuote(options.description)}`,
    "---",
    ""
  ].join("\n");

  return `${frontmatter}${options.sourceContent.replace(/^\uFEFF/, "")}`;
}
