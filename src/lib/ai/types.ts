import type { Recommendation, TenantRiskReasoning } from "@/lib/database.types";
import type { RiskLevel } from "@/lib/risk-report";

export type TenantReviewInput = {
  checkId: string;
  tenantFullName: string;
  requestedDocuments: string[];
  propertyMonthlyRent: number | null;
  tenantProfile: {
    employmentStatus: string | null;
    employerName: string | null;
    monthlyIncome: number | null;
    currentAddress: string | null;
    notes: string | null;
  } | null;
  documents: Array<{
    documentType: string;
    fileName: string;
    extractedText: string | null;
  }>;
};

export type AiUsageCostRecord = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  responseId: string | null;
  generatedAt: string;
};

export type GeneratedTenantReport = {
  score: number;
  recommendation: Recommendation;
  summary: string;
  explanation: string;
  redFlags: string[];
  strengths: string[];
  missingDocuments: string[];
  reasoning: TenantRiskReasoning;
  generatedBy: string;
  riskLevel: RiskLevel;
};
