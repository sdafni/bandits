import type { Recommendation } from "@/lib/database.types";
import type { RiskLevel } from "@/lib/risk-report";

export type ProfessionalReportData = {
  reportId: string;
  reportDate: string;
  tenantName: string;
  propertyName: string | null;
  verificationStatus: string;
  tenant: {
    fullName: string;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    occupation: string | null;
    monthlyIncome: number | null;
    requestedRent: number | null;
    incomeToRentRatio: number | null;
  };
  assessment: {
    score: number;
    riskLevel: RiskLevel;
    recommendation: Recommendation;
    recommendationLabel: string;
    riskLevelLabel: string;
  };
  uploadedDocuments: string[];
  missingDocuments: string[];
  financialReliability: {
    creditReport: "uploaded" | "not_uploaded";
    creditScore: "available" | "not_available";
  };
  redFlags: string[];
  explanation: {
    summary: string;
    strengths: string[];
    concerns: string[];
    suggestedActions: string[];
  };
  reportVersion: string;
  partnerSchemaVersion: string;
};

export type StoredProfessionalReport = {
  storagePath: string;
  fileName: string;
  generatedAt: string;
};
