import type { Recommendation } from "@/lib/database.types";

/** SafeKey risk band derived from the 0–100 score. */
export type RiskLevel = "low" | "medium" | "high";

const IDENTITY_DOCUMENT_TYPES = new Set([
  "passport",
  "national_id",
  "government_id",
  "residency_permit",
]);

export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) {
    return "low";
  }

  if (score >= 60) {
    return "medium";
  }

  return "high";
}

export function getRiskLevelLabel(level: RiskLevel): string {
  if (level === "low") {
    return "Low";
  }

  if (level === "medium") {
    return "Medium";
  }

  return "High";
}

export function getRecommendationLabel(recommendation: Recommendation): string {
  if (recommendation === "approve") {
    return "Approve";
  }

  if (recommendation === "conditional") {
    return "Approve With Conditions";
  }

  return "Reject";
}

export function hasIdentityDocument(documentTypes: Iterable<string>) {
  for (const documentType of documentTypes) {
    if (IDENTITY_DOCUMENT_TYPES.has(documentType)) {
      return true;
    }
  }

  return false;
}

export function resolveRiskLevelFromReport(score: number, reasoning?: { riskLevel?: RiskLevel | null }) {
  return reasoning?.riskLevel ?? getRiskLevelFromScore(score);
}
