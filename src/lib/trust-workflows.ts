import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";
import {
  SAFEKEY_DOCUMENT_CATEGORIES,
  SAFEKEY_DOCUMENT_DEFINITIONS,
  getCatalogDocumentDefinition,
  getCatalogDocumentLabel,
  getDefaultRecommendedDocuments,
  normalizeDocumentType,
  normalizeRequestedDocuments,
  type SafeKeyDocumentCategoryKey,
  type SafeKeyDocumentDefinition,
} from "@/lib/safekey-document-catalog";

export type TrustWorkflowExperience = "basic" | "pro" | "premium";

export type TrustDocumentCategoryKey = SafeKeyDocumentCategoryKey;
export type TrustDocumentDefinition = SafeKeyDocumentDefinition;

export const TRUST_DOCUMENT_CATEGORIES = SAFEKEY_DOCUMENT_CATEGORIES;
export const TRUST_DOCUMENT_DEFINITIONS = SAFEKEY_DOCUMENT_DEFINITIONS;

export function getRequiredDocumentsForExperience(experience: TrustWorkflowExperience) {
  return experience === "basic"
    ? ["national_id", "bank_statement", "payslips"]
    : getDefaultRecommendedDocuments();
}

export function getDefaultRequestedDocumentsForPlan(planKey: "basic" | "pro" | "premium" | null | undefined) {
  return getRequiredDocumentsForExperience(planKey === "basic" || !planKey ? "basic" : "pro");
}

export function getDocumentDefinition(value: string) {
  return getCatalogDocumentDefinition(value);
}

export function getDocumentLabel(value: string) {
  return getCatalogDocumentLabel(value);
}

export function buildTrustWorkflowReport(params: {
  requestedDocuments: string[];
  uploadedDocuments: string[];
  analystNotes?: string | null;
  riskFlags?: string[] | null;
  recommendation?: "approve" | "conditional" | "decline" | null;
  score?: number | null;
  caseId?: string;
  caseCreatedAt?: string | null;
  consent?: { granted: boolean; recordedAt?: string | null } | null;
  documentHistory?: Array<{ documentType: string; uploadedAt: string; fileName?: string | null }>;
  reviewCompletedAt?: string | null;
}) {
  const requestedDocuments = normalizeRequestedDocuments(params.requestedDocuments);
  const uploadedDocuments = params.uploadedDocuments.map((value) => normalizeDocumentType(value));
  const uploadedSet = new Set(uploadedDocuments);
  const missingDocuments = requestedDocuments.filter((value) => !uploadedSet.has(value));
  const byCategory = (category: TrustDocumentCategoryKey) =>
    requestedDocuments.filter((value) => getDocumentDefinition(value)?.category === category);
  const byCatalogTier = (tier: SafeKeyDocumentDefinition["catalogTier"]) =>
    requestedDocuments.filter((value) => getDocumentDefinition(value)?.catalogTier === tier);
  const hasIdentityProof = uploadedDocuments.some(
    (value) => getDocumentDefinition(value)?.category === "identity",
  );
  const trustIndicatorDocs = new Set([
    "bank_statement",
    "payslips",
    "employer_letter",
    "guarantor",
    "employment_contract",
    "tax_return",
    "utility_bill",
    "recommendation_letter",
  ]);
  const trustIndicatorsUploaded = uploadedDocuments.filter((value) => trustIndicatorDocs.has(value)).length;
  const referencesUploaded = uploadedDocuments.filter((value) => value === "landlord_reference").length;
  const highRiskDetected =
    (params.score != null && params.score < 45) ||
    (params.riskFlags ?? []).length > 0 ||
    params.recommendation === "decline";
  const confidenceLevel = highRiskDetected
    ? "HIGH RISK"
    : hasIdentityProof && trustIndicatorsUploaded >= 2 && referencesUploaded > 0
      ? "HIGH CONFIDENCE"
      : hasIdentityProof && trustIndicatorsUploaded >= 1
        ? "MEDIUM CONFIDENCE"
        : hasIdentityProof
          ? "LIMITED CONFIDENCE"
          : "HIGH RISK";

  const identityScore = hasIdentityProof ? 25 : 5;
  const financialScore = Math.min(25, trustIndicatorsUploaded * 8);
  const completenessRatio =
    requestedDocuments.length > 0
      ? uploadedDocuments.filter((value) => requestedDocuments.includes(value)).length / requestedDocuments.length
      : 0;
  const completenessScore = Math.round(completenessRatio * 20);
  const consistencyPenalty = highRiskDetected ? -20 : 0;
  const uploadQualityScore = Math.min(15, Math.max(0, uploadedDocuments.length * 2));
  const analystAdjustment = params.recommendation === "approve" ? 10 : params.recommendation === "decline" ? -10 : 0;
  const confidenceScore = Math.max(
    0,
    Math.min(
      100,
      identityScore + financialScore + completenessScore + uploadQualityScore + analystAdjustment + consistencyPenalty,
    ),
  );

  const recommendation =
    confidenceScore >= 80
      ? "Recommended"
      : confidenceScore >= 65
        ? "Recommended with caution"
        : confidenceScore >= 45
          ? "Additional verification recommended"
          : confidenceScore >= 30
            ? "Limited confidence profile"
            : "High risk profile";

  const identitySection = [
    hasIdentityProof ? "Government ID received" : "Government ID missing",
    uploadedDocuments.includes("residence_permit")
      ? "Residency documentation received"
      : "Residency documentation not provided",
    highRiskDetected ? "Information consistency requires manual review" : "Name consistency appears stable",
  ];
  const financialSection = [
    trustIndicatorsUploaded >= 2 ? "Stable recurring income indicators detected" : "Partial financial visibility",
    uploadedDocuments.includes("bank_statement")
      ? "Bank history available"
      : "Limited banking history available",
  ];
  const documentChecklist = [
    { label: "ID verified", state: hasIdentityProof ? "complete" : "missing" },
    {
      label: "Income evidence received",
      state: uploadedDocuments.some((value) => getDocumentDefinition(value)?.category === "income")
        ? "complete"
        : "warning",
    },
    {
      label: "Financial evidence depth",
      state: uploadedDocuments.includes("bank_statement") ? "complete" : "warning",
    },
    {
      label: "Landlord references",
      state: referencesUploaded > 0 ? "complete" : "warning",
    },
    {
      label: "Tax documentation",
      state: uploadedDocuments.includes("tax_return") ? "complete" : "missing",
    },
  ] as const;
  const rentalRiskIndicators = [
    uploadedDocuments.includes("residence_permit") ? "International relocation case" : null,
    uploadedDocuments.includes("employer_letter") ? "Employer verification available" : null,
    referencesUploaded === 0 ? "No previous landlord references" : null,
    uploadedDocuments.includes("guarantor") ? "Guarantor provided" : null,
  ].filter((item): item is string => Boolean(item));
  const missingItemsGuidance =
    byCatalogTier("core").filter((value) => !uploadedSet.has(value)).length > 0
      ? "To improve confidence, additional bank statements, income continuity evidence, or landlord references are recommended."
      : "Current evidence set is sufficient for a confidence-led landlord decision.";
  const protectionSuggestions = [
    confidenceScore < 65 ? "Additional deposit recommended" : null,
    !uploadedDocuments.includes("guarantor") && confidenceScore < 55 ? "Guarantor recommended" : null,
    byCatalogTier("core").filter((value) => !uploadedSet.has(value)).length > 0
      ? "Additional income verification recommended"
      : null,
  ].filter((item): item is string => Boolean(item));
  const generatedAt = new Date().toISOString();
  const auditTrail = [
    {
      event: "case_created",
      timestamp: params.caseCreatedAt ?? generatedAt,
    },
    ...(params.consent
      ? [
          {
            event: params.consent.granted ? "consent_recorded" : "consent_missing",
            timestamp: params.consent.recordedAt ?? generatedAt,
          },
        ]
      : []),
    ...(params.documentHistory ?? []).map((item) => ({
      event: "document_uploaded",
      timestamp: item.uploadedAt,
      documentType: item.documentType,
      fileName: item.fileName ?? null,
    })),
    ...(params.reviewCompletedAt
      ? [
          {
            event: "trust_report_completed",
            timestamp: params.reviewCompletedAt,
          },
        ]
      : []),
  ];
  const underwritingReadiness = {
    caseId: params.caseId ?? "unknown",
    generatedAt,
    reportVersion: "v1.0",
    consentRecord: {
      granted: params.consent?.granted ?? false,
      recordedAt: params.consent?.recordedAt ?? null,
    },
    confidence: {
      level: confidenceLevel,
      score: confidenceScore,
      recommendation,
    },
    documentHistory: params.documentHistory ?? [],
    riskIndicators: rentalRiskIndicators,
    missingItems: missingDocuments.map(getDocumentLabel),
    protectionSuggestions,
    auditTrail,
  };

  return {
    auditTrail,
    confidenceScore,
    identityReceived: byCategory("identity").filter((value) => uploadedSet.has(value)),
    incomeReceived: byCategory("income").filter((value) => uploadedSet.has(value)),
    financialReceived: byCategory("financial").filter((value) => uploadedSet.has(value)),
    confidenceLevel,
    documentChecklist,
    financialSection,
    identitySection,
    minimumEvidenceMet: hasIdentityProof && trustIndicatorsUploaded >= 1,
    missingItemsGuidance,
    optionalReceived: [...byCategory("trust_boost"), ...byCategory("advanced")].filter((value) =>
      uploadedSet.has(value),
    ),
    optionalRequested: [...byCatalogTier("trust_boost"), ...byCatalogTier("advanced")],
    protectionSuggestions,
    recommendedMissing: byCatalogTier("core").filter((value) => !uploadedSet.has(value)),
    requiredMissing: byCatalogTier("core").filter((value) => !uploadedSet.has(value)),
    rentalRiskIndicators,
    missingDocuments,
    rentalHistoryReceived: byCategory("rental_history").filter((value) => uploadedSet.has(value)),
    recommendation,
    riskFlags: params.riskFlags ?? [],
    underwritingReadiness,
    analystNotes:
      params.analystNotes?.trim() ||
      "No analyst note was added yet. Continue collecting missing documents for a final decision.",
  };
}

export function getWorkflowStatusLabel(
  params: {
    status: "draft" | "pending_upload" | "documents_received" | "under_review" | "report_ready";
    uploadTokenExpiresAt?: string | null;
    workflowActivatedAt?: string | null;
  },
  locale: AppLocale = "en",
) {
  if (params.status === "draft" || !params.workflowActivatedAt) {
    return translate(locale, "checkStatus.draft");
  }
  if (params.status === "report_ready") {
    return translate(locale, "checkStatus.recommendationReady");
  }
  if (params.uploadTokenExpiresAt && new Date(params.uploadTokenExpiresAt).getTime() < Date.now()) {
    return translate(locale, "checkStatus.linkExpired");
  }
  if (params.status === "pending_upload") {
    return translate(locale, "checkStatus.awaitingDocuments");
  }
  if (params.status === "documents_received") {
    return translate(locale, "checkStatus.documentsReceived");
  }
  return translate(locale, "checkStatus.underReview");
}
