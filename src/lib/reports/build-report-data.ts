import type { Database } from "@/lib/database.types";
import { getDocumentDefinition } from "@/lib/trust-workflows";
import {
  getRecommendationLabel,
  getRiskLevelLabel,
  resolveRiskLevelFromReport,
  type RiskLevel,
} from "@/lib/risk-report";
import { PARTNER_REPORT_SCHEMA_VERSION, PROFESSIONAL_REPORT_VERSION } from "@/lib/reports/constants";
import type { ProfessionalReportData } from "@/lib/reports/types";

type AiReportRow = Database["public"]["Tables"]["ai_reports"]["Row"];

type BuildReportInput = {
  checkId: string;
  tenantFullName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  propertyName: string | null;
  propertyMonthlyRent: number | null;
  status: string;
  aiReport: AiReportRow;
  tenantProfile: {
    email: string | null;
    phone: string | null;
    employment_status: string | null;
    employer_name: string | null;
    monthly_income: number | null;
  } | null;
  uploadedDocumentTypes: string[];
};

function formatDocumentLabel(value: string) {
  return getDocumentDefinition(value)?.label ?? value.replaceAll("_", " ");
}

function inferNationality(documentTypes: string[]) {
  if (documentTypes.includes("passport")) return "Passport holder (verify country)";
  if (documentTypes.includes("residency_permit")) return "Residency permit holder";
  if (documentTypes.includes("national_id")) return "National ID holder";
  return null;
}

function inferOccupation(profile: BuildReportInput["tenantProfile"]) {
  if (!profile?.employment_status && !profile?.employer_name) return null;
  const status = profile.employment_status?.replaceAll("_", " ") ?? "";
  const employer = profile.employer_name?.trim();
  if (status && employer) return `${status} · ${employer}`;
  return status || employer || null;
}

function buildSuggestedActions(
  recommendation: AiReportRow["recommendation"],
  missingCount: number,
  redFlagCount: number,
) {
  const actions: string[] = [];

  if (missingCount > 0) {
    actions.push("Request outstanding documents before signing the lease.");
  }
  if (redFlagCount > 0) {
    actions.push("Review flagged items and confirm with the tenant in writing.");
  }
  if (recommendation === "conditional") {
    actions.push("Proceed only after conditions are documented and satisfied.");
  } else if (recommendation === "decline") {
    actions.push("Do not proceed on the current file without further escalation.");
  } else {
    actions.push("Proceed with standard tenancy completion and reference checks.");
  }

  return actions;
}

function normalizeReportReasoning(reasoning: AiReportRow["reasoning"]) {
  if (reasoning && typeof reasoning === "object" && !Array.isArray(reasoning)) {
    return reasoning as {
      debtToIncomeRatio?: number | null;
      riskLevel?: RiskLevel | null;
      explanation?: string | null;
    };
  }

  return {};
}

export function buildProfessionalReportData(input: BuildReportInput): ProfessionalReportData {
  const reasoning = normalizeReportReasoning(input.aiReport.reasoning);
  const riskLevel = resolveRiskLevelFromReport(input.aiReport.score, reasoning);
  const income = input.tenantProfile?.monthly_income ?? null;
  const rent = input.propertyMonthlyRent;
  const incomeToRentRatio = income && rent ? rent / income : reasoning.debtToIncomeRatio ?? null;

  const uploadedDocuments = input.uploadedDocumentTypes.map(formatDocumentLabel);
  const missingDocuments = input.aiReport.missing_documents.map(formatDocumentLabel);

  const explanationText =
    reasoning.explanation?.trim() ||
    input.aiReport.summary ||
    "SafeKey assigned this score based on document completeness, affordability, and extracted risk signals.";

  return {
    reportId: input.aiReport.id,
    reportDate: new Date(input.aiReport.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    tenantName: input.tenantFullName,
    propertyName: input.propertyName,
    verificationStatus: input.status === "report_ready" ? "Verified · Report ready" : "Under review",
    tenant: {
      fullName: input.tenantFullName,
      email: input.tenantProfile?.email ?? input.tenantEmail,
      phone: input.tenantProfile?.phone ?? input.tenantPhone,
      nationality: inferNationality(input.uploadedDocumentTypes),
      occupation: inferOccupation(input.tenantProfile),
      monthlyIncome: income,
      requestedRent: rent,
      incomeToRentRatio,
    },
    assessment: {
      score: input.aiReport.score,
      riskLevel,
      recommendation: input.aiReport.recommendation,
      recommendationLabel: getRecommendationLabel(input.aiReport.recommendation),
      riskLevelLabel: getRiskLevelLabel(riskLevel),
    },
    uploadedDocuments,
    missingDocuments,
    redFlags: input.aiReport.red_flags,
    explanation: {
      summary: explanationText,
      strengths: input.aiReport.strengths,
      concerns: input.aiReport.red_flags,
      suggestedActions: buildSuggestedActions(
        input.aiReport.recommendation,
        missingDocuments.length,
        input.aiReport.red_flags.length,
      ),
    },
    reportVersion: PROFESSIONAL_REPORT_VERSION,
    partnerSchemaVersion: PARTNER_REPORT_SCHEMA_VERSION,
  };
}
