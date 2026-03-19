import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { loadManifest, validateManifest } from "./manifest.js";
import type { SkillDescriptor, SkillManifest, ValidationIssue } from "../types/skill.js";

export async function scanSkillDirectories(skillsDir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsDir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

export async function validateSkillEntry(skillPath: string, manifest: SkillManifest): Promise<ValidationIssue[]> {
  const entryPath = path.join(skillPath, manifest.entry);

  try {
    const entryStat = await stat(entryPath);
    if (!entryStat.isFile()) {
      return [
        {
          code: "entry_not_found",
          message: `Entry path is not a file: ${entryPath}`,
          field: "entry",
          path: entryPath
        }
      ];
    }
  } catch {
    return [
      {
        code: "entry_not_found",
        message: `Entry file not found: ${entryPath}`,
        field: "entry",
        path: entryPath
      }
    ];
  }

  return [];
}

export function buildSkillDescriptor(params: {
  skillPath: string;
  manifestPath: string;
  manifest: SkillManifest | null;
  issues: ValidationIssue[];
}): SkillDescriptor {
  const { skillPath, manifestPath, manifest, issues } = params;

  return {
    directoryName: path.basename(skillPath),
    skillPath,
    manifestPath,
    entryPath: manifest ? path.join(skillPath, manifest.entry) : null,
    manifest,
    issues,
    isValid: issues.length === 0 && manifest !== null,
    compatibleAgents: manifest?.compatibleAgents ?? []
  };
}

export async function discoverSkills(skillsDir: string): Promise<SkillDescriptor[]> {
  const skillPaths = await scanSkillDirectories(skillsDir);
  const descriptors: SkillDescriptor[] = [];

  for (const skillPath of skillPaths) {
    const manifestPath = path.join(skillPath, "manifest.json");
    const manifestLoad = await loadManifest(manifestPath);

    if (!manifestLoad.ok) {
      descriptors.push(
        buildSkillDescriptor({
          skillPath,
          manifestPath,
          manifest: null,
          issues: manifestLoad.issues
        })
      );
      continue;
    }

    const manifestValidation = validateManifest(manifestLoad.value, manifestPath);
    if (!manifestValidation.ok) {
      descriptors.push(
        buildSkillDescriptor({
          skillPath,
          manifestPath,
          manifest: null,
          issues: manifestValidation.issues
        })
      );
      continue;
    }

    const manifest = manifestValidation.value;
    if (manifest === undefined) {
      descriptors.push(
        buildSkillDescriptor({
          skillPath,
          manifestPath,
          manifest: null,
          issues: [
            {
              code: "manifest_invalid_shape",
              message: `Validated manifest unexpectedly missing value: ${manifestPath}`,
              path: manifestPath
            }
          ]
        })
      );
      continue;
    }

    const entryIssues = await validateSkillEntry(skillPath, manifest);
    descriptors.push(
      buildSkillDescriptor({
        skillPath,
        manifestPath,
        manifest,
        issues: entryIssues
      })
    );
  }

  return descriptors;
}
