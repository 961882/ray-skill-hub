export interface SkillManifest {
  name: string;
  version: string;
  entry: string;
  tags: string[];
  triggers: string[];
  compatibleAgents: string[];
  description?: string;
  scripts?: Record<string, string>;
  resources?: string[];
  installHints?: string[];
  adapterOverrides?: Record<string, Record<string, string | number | boolean>>;
  dependencies?: string[];
  visibility?: "private" | "public" | "workspace";
}

export type ValidationIssueCode =
  | "manifest_not_found"
  | "manifest_invalid_json"
  | "manifest_invalid_shape"
  | "manifest_missing_required_field"
  | "manifest_invalid_field_type"
  | "entry_not_found";

export interface ValidationIssue {
  code: ValidationIssueCode;
  message: string;
  field?: string;
  path?: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  issues: ValidationIssue[];
}

export interface SkillDescriptor {
  directoryName: string;
  skillPath: string;
  manifestPath: string;
  entryPath: string | null;
  manifest: SkillManifest | null;
  issues: ValidationIssue[];
  isValid: boolean;
  compatibleAgents: string[];
}
