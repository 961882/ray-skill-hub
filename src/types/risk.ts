export type RiskLevel = "low" | "medium" | "high";

export function maxRiskLevel(levels: RiskLevel[]): RiskLevel {
  if (levels.includes("high")) {
    return "high";
  }
  if (levels.includes("medium")) {
    return "medium";
  }
  return "low";
}
