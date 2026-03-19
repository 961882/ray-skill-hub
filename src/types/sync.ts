import type { SkillDescriptor } from "./skill.js";
import type { RiskLevel } from "./risk.js";
import type { CommandIntentMeta } from "./commands.js";

export const SYNC_REASON_CODES = {
  unsupportedSkill: "unsupported_skill",
  skillStructureIncomplete: "skill_structure_incomplete",
  entryPathEscape: "entry_path_escape",
  transformEntryNotMarkdown: "transform_entry_not_markdown",
  resourcePathEscape: "resource_path_escape",
  resourceNotFound: "resource_not_found",
  targetPathConflict: "target_path_conflict",
  targetRootInvalid: "target_root_invalid",
  targetRootNotWritable: "target_root_not_writable",
  requestedSkillNotFound: "requested_skill_not_found",
  noSourceChanges: "no_source_changes",
  syncExecutionFailed: "sync_execution_failed"
} as const;

export type SyncReasonCode = (typeof SYNC_REASON_CODES)[keyof typeof SYNC_REASON_CODES];

export interface SyncIssueDetails {
  targetPath?: string;
  conflictingSkillName?: string;
  conflictSource?: "current_sync_batch" | "installed_state";
}

export interface SyncIssueSummary {
  skillName: string;
  reasonCode: SyncReasonCode;
  reason: string;
  riskLevel: RiskLevel;
  suggestion?: string;
  details?: SyncIssueDetails;
}

export interface SyncSuccessSummary {
  skillName: string;
  targetPath: string;
  changedFiles: string[];
}

export interface SyncRepairSummary {
  skillName: string;
  targetPath: string;
  removedInstallFor: string;
  reason: string;
  mode: "preview" | "performed";
  riskLevel: RiskLevel;
}

export interface SyncPreflightResult {
  descriptor: SkillDescriptor;
  supported: boolean;
  riskLevel?: RiskLevel;
  reasonCode?: SyncReasonCode;
  reason?: string;
  suggestion?: string;
  details?: SyncIssueDetails;
  targetPath?: string;
  sourceHash?: string;
  noChange?: boolean;
}

export interface SyncExecutionSummary {
  agentName: string;
  dryRun: boolean;
  executionIntent: CommandIntentMeta;
  noOp: boolean;
  riskLevel: RiskLevel;
  repaired: SyncRepairSummary[];
  success: SyncSuccessSummary[];
  skipped: SyncIssueSummary[];
  failed: SyncIssueSummary[];
}
