import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RegistryIndex, RegistrySkillRecord } from "../types/agent.js";
import type { SkillDescriptor } from "../types/skill.js";
import { discoverSkills } from "./discovery.js";

function hashDescriptor(descriptor: SkillDescriptor): string {
  const payload = JSON.stringify({
    skillPath: descriptor.skillPath,
    manifest: descriptor.manifest,
    issues: descriptor.issues
  });

  return createHash("sha256").update(payload).digest("hex");
}

function toRegistrySkillRecord(descriptor: SkillDescriptor): RegistrySkillRecord {
  return {
    name: descriptor.manifest?.name ?? descriptor.directoryName,
    version: descriptor.manifest?.version ?? "0.0.0-invalid",
    path: descriptor.skillPath,
    entry: descriptor.manifest?.entry ?? "",
    tags: descriptor.manifest?.tags ?? [],
    triggers: descriptor.manifest?.triggers ?? [],
    compatibleAgents: descriptor.compatibleAgents,
    manifestHash: hashDescriptor(descriptor),
    isValid: descriptor.isValid
  };
}

export function buildRegistryIndex(descriptors: SkillDescriptor[]): RegistryIndex {
  const skills = descriptors
    .map(toRegistrySkillRecord)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    generatedAt: new Date().toISOString(),
    skills
  };
}

export async function saveRegistryIndex(registryDir: string, index: RegistryIndex): Promise<string> {
  await mkdir(registryDir, { recursive: true });
  const outputPath = path.join(registryDir, "index.json");
  await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return outputPath;
}

export async function loadRegistryIndex(registryDir: string): Promise<RegistryIndex | null> {
  const inputPath = path.join(registryDir, "index.json");

  try {
    const raw = await readFile(inputPath, "utf8");
    return JSON.parse(raw) as RegistryIndex;
  } catch {
    return null;
  }
}

export async function rebuildRegistryFromSource(skillsDir: string, registryDir: string): Promise<RegistryIndex> {
  const descriptors = await discoverSkills(skillsDir);
  const index = buildRegistryIndex(descriptors);
  await saveRegistryIndex(registryDir, index);
  return index;
}
