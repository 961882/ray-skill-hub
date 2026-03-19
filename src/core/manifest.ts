import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SkillManifest, ValidationIssue, ValidationResult } from "../types/skill.js";

const REQUIRED_ARRAY_FIELDS = ["tags", "triggers", "compatibleAgents"] as const;
const REQUIRED_STRING_FIELDS = ["name", "version", "entry"] as const;

function issue(code: ValidationIssue["code"], message: string, field?: string, filePath?: string): ValidationIssue {
  const base: ValidationIssue = {
    code,
    message
  };

  if (field !== undefined) {
    base.field = field;
  }
  if (filePath !== undefined) {
    base.path = filePath;
  }

  return base;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

export async function loadManifest(manifestPath: string): Promise<ValidationResult<unknown>> {
  try {
    const raw = await readFile(manifestPath, "utf8");
    return {
      ok: true,
      value: JSON.parse(raw),
      issues: []
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {
        ok: false,
        issues: [issue("manifest_not_found", `Manifest file not found: ${manifestPath}`, undefined, manifestPath)]
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        issues: [issue("manifest_invalid_json", `Manifest JSON is invalid: ${manifestPath}`, undefined, manifestPath)]
      };
    }

    return {
      ok: false,
      issues: [issue("manifest_invalid_json", `Unable to read manifest: ${manifestPath}`, undefined, manifestPath)]
    };
  }
}

export function validateManifest(input: unknown, manifestPath: string): ValidationResult<SkillManifest> {
  const issues: ValidationIssue[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      ok: false,
      issues: [issue("manifest_invalid_shape", "Manifest must be a JSON object", undefined, manifestPath)]
    };
  }

  const record = input as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = record[field];
    if (value === undefined) {
      issues.push(issue("manifest_missing_required_field", `Missing required field: ${field}`, field, manifestPath));
      continue;
    }

    if (!isNonEmptyString(value)) {
      issues.push(issue("manifest_invalid_field_type", `Field '${field}' must be a non-empty string`, field, manifestPath));
    }
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    const value = record[field];
    if (value === undefined) {
      issues.push(issue("manifest_missing_required_field", `Missing required field: ${field}`, field, manifestPath));
      continue;
    }

    if (!isStringArray(value)) {
      issues.push(issue("manifest_invalid_field_type", `Field '${field}' must be an array of non-empty strings`, field, manifestPath));
    }
  }

  const description = record.description;
  if (description !== undefined && !isNonEmptyString(description)) {
    issues.push(issue("manifest_invalid_field_type", "Field 'description' must be a non-empty string", "description", manifestPath));
  }

  const resources = record.resources;
  if (resources !== undefined && !isStringArray(resources)) {
    issues.push(issue("manifest_invalid_field_type", "Field 'resources' must be an array of non-empty strings", "resources", manifestPath));
  }

  const installHints = record.installHints;
  if (installHints !== undefined && !isStringArray(installHints)) {
    issues.push(issue("manifest_invalid_field_type", "Field 'installHints' must be an array of non-empty strings", "installHints", manifestPath));
  }

  const dependencies = record.dependencies;
  if (dependencies !== undefined && !isStringArray(dependencies)) {
    issues.push(issue("manifest_invalid_field_type", "Field 'dependencies' must be an array of non-empty strings", "dependencies", manifestPath));
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues
    };
  }

  const manifest: SkillManifest = {
    name: record.name as string,
    version: record.version as string,
    entry: path.normalize(record.entry as string),
    tags: record.tags as string[],
    triggers: record.triggers as string[],
    compatibleAgents: record.compatibleAgents as string[]
  };

  if (typeof description === "string") {
    manifest.description = description;
  }
  if (Array.isArray(resources)) {
    manifest.resources = resources as string[];
  }
  if (Array.isArray(installHints)) {
    manifest.installHints = installHints as string[];
  }
  if (Array.isArray(dependencies)) {
    manifest.dependencies = dependencies as string[];
  }
  if (record.scripts !== undefined && typeof record.scripts === "object" && record.scripts !== null && !Array.isArray(record.scripts)) {
    const scripts = record.scripts as Record<string, unknown>;
    if (Object.values(scripts).every((value) => typeof value === "string")) {
      manifest.scripts = scripts as Record<string, string>;
    }
  }
  if (record.adapterOverrides !== undefined && typeof record.adapterOverrides === "object" && record.adapterOverrides !== null && !Array.isArray(record.adapterOverrides)) {
    manifest.adapterOverrides = record.adapterOverrides as Record<string, Record<string, string | number | boolean>>;
  }
  if (record.visibility === "private" || record.visibility === "public" || record.visibility === "workspace") {
    manifest.visibility = record.visibility;
  }

  return {
    ok: true,
    value: manifest,
    issues: []
  };
}
