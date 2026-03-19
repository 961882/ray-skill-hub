import type { ValidationIssueCode } from "./skill.js";
import type { RiskLevel } from "./risk.js";

export const DOCTOR_CODES = {
  skillsDirMissing: "skills_dir_missing",
  registryDirMissing: "registry_dir_missing",
  stateDirMissing: "state_dir_missing",
  agentConfigMissing: "agent_config_missing",
  duplicateSkillName: "duplicate_skill_name",
  missingAgentDefinition: "missing_agent_definition",
  targetPathConflict: "target_path_conflict",
  staleInstallRecord: "stale_install_record",
  brokenSymlinkInstall: "broken_symlink_install",
  staleSymlinkTarget: "stale_symlink_target",
  installTargetInvalid: "install_target_invalid",
  installTargetDrift: "install_target_drift",
  missingInstallTarget: "missing_install_target",
  doctorSummary: "doctor_summary"
} as const;

export type DoctorSeverity = "info" | "warning" | "error";
export type DoctorCode = ValidationIssueCode | (typeof DOCTOR_CODES)[keyof typeof DOCTOR_CODES];

export interface DoctorCheckResult {
  severity: DoctorSeverity;
  code: DoctorCode;
  message: string;
  riskLevel: RiskLevel;
  suggestion?: string;
  path?: string;
}

export interface DoctorCodeGroup {
  code: DoctorCode;
  count: number;
  highestSeverity: DoctorSeverity;
  riskLevel: RiskLevel;
}

export interface DoctorSummary {
  discoveredSkills: number;
  configuredAgents: number;
  installRecordCount: number;
  historyRecordCount: number;
  issueCounts: {
    info: number;
    warning: number;
    error: number;
  };
  codeGroups: DoctorCodeGroup[];
  topRiskCodes: DoctorCodeGroup[];
  riskLevel: RiskLevel;
}

export interface DoctorReport {
  summary: DoctorSummary;
  results: DoctorCheckResult[];
}
