export type TrustWorkflowExperience = "basic" | "pro" | "premium";

export type TrustDocumentCategoryKey =
  | "identity"
  | "income"
  | "financial"
  | "rental_history"
  | "optional";

export type TrustDocumentDefinition = {
  value: string;
  label: string;
  category: TrustDocumentCategoryKey;
  priority: "required" | "recommended" | "optional";
};

export const TRUST_DOCUMENT_CATEGORIES: Record<TrustDocumentCategoryKey, { label: string }> = {
  identity: { label: "Identity" },
  income: { label: "Income" },
  financial: { label: "Financial" },
  rental_history: { label: "Rental history" },
  optional: { label: "Optional" },
};

export const TRUST_DOCUMENT_DEFINITIONS: TrustDocumentDefinition[] = [
  { category: "identity", label: "Passport", priority: "required", value: "passport" },
  { category: "identity", label: "National ID", priority: "required", value: "national_id" },
  { category: "identity", label: "Residency permit", priority: "required", value: "residency_permit" },
  { category: "income", label: "Payslips", priority: "recommended", value: "payslips" },
  { category: "income", label: "Employment contract", priority: "recommended", value: "employment_contract" },
  { category: "income", label: "Tax return", priority: "recommended", value: "tax_return" },
  { category: "income", label: "Accountant letter", priority: "recommended", value: "accountant_letter" },
  { category: "income", label: "Freelance income proof", priority: "recommended", value: "freelance_income" },
  { category: "income", label: "Relocation contract", priority: "recommended", value: "relocation_contract" },
  { category: "financial", label: "Bank statements", priority: "recommended", value: "bank_statement" },
  { category: "financial", label: "Proof of savings", priority: "recommended", value: "proof_of_savings" },
  { category: "rental_history", label: "Previous landlord reference", priority: "recommended", value: "landlord_reference" },
  { category: "rental_history", label: "Previous lease agreement", priority: "recommended", value: "previous_lease_agreement" },
  { category: "optional", label: "Guarantor documents", priority: "optional", value: "guarantor_documents" },
  { category: "optional", label: "Visa documents", priority: "optional", value: "visa_documents" },
  { category: "optional", label: "Pet documentation", priority: "optional", value: "pet_documentation" },
];

const BASIC_REQUIRED_DOCUMENTS = ["national_id", "bank_statement"] as const;

const PRO_REQUIRED_DOCUMENTS = [
  "national_id",
  "passport",
  "payslips",
  "employment_contract",
  "bank_statement",
  "landlord_reference",
] as const;

export function getRequiredDocumentsForExperience(experience: TrustWorkflowExperience) {
  return experience === "basic" ? [...BASIC_REQUIRED_DOCUMENTS] : [...PRO_REQUIRED_DOCUMENTS];
}

export function getDefaultRequestedDocumentsForPlan(planKey: "basic" | "pro" | "premium" | null | undefined) {
  return getRequiredDocumentsForExperience(planKey === "basic" || !planKey ? "basic" : "pro");
}

export function getDocumentDefinition(value: string) {
  return TRUST_DOCUMENT_DEFINITIONS.find((item) => item.value === value) ?? null;
}

export function getDocumentLabel(value: string) {
  return getDocumentDefinition(value)?.label ?? value.replaceAll("_", " ");
}

export function buildTrustWorkflowReport(params: {
  requestedDocuments: string[];
  uploadedDocuments: string[];
  analystNotes?: string | null;
  riskFlags?: string[] | null;
  recommendation?: "approve" | "conditional" | "decline" | null;
  score?: number | null;
}) {
  const uploadedSet = new Set(params.uploadedDocuments);
  const missingDocuments = params.requestedDocuments.filter((value) => !uploadedSet.has(value));
  const byCategory = (category: TrustDocumentCategoryKey) =>
    params.requestedDocuments.filter((value) => getDocumentDefinition(value)?.category === category);
  const byPriority = (priority: TrustDocumentDefinition["priority"]) =>
    params.requestedDocuments.filter((value) => getDocumentDefinition(value)?.priority === priority);
  const hasIdentityProof = params.uploadedDocuments.some(
    (value) => getDocumentDefinition(value)?.category === "identity",
  );
  const trustIndicatorDocs = new Set([
    "bank_statement",
    "payslips",
    "proof_of_savings",
    "guarantor_documents",
    "freelance_income",
    "relocation_contract",
    "employment_contract",
    "tax_return",
    "accountant_letter",
  ]);
  const trustIndicatorsUploaded = params.uploadedDocuments.filter((value) => trustIndicatorDocs.has(value)).length;
  const referencesUploaded = params.uploadedDocuments.filter((value) => value === "landlord_reference" || value === "previous_lease_agreement").length;
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
    params.requestedDocuments.length > 0
      ? params.uploadedDocuments.filter((value) => params.requestedDocuments.includes(value)).length /
        params.requestedDocuments.length
      : 0;
  const completenessScore = Math.round(completenessRatio * 20);
  const consistencyPenalty = highRiskDetected ? -20 : 0;
  const uploadQualityScore = Math.min(15, Math.max(0, params.uploadedDocuments.length * 2));
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
    params.uploadedDocuments.includes("residency_permit")
      ? "Residency documentation received"
      : "Residency documentation not provided",
    highRiskDetected ? "Information consistency requires manual review" : "Name consistency appears stable",
  ];
  const financialSection = [
    trustIndicatorsUploaded >= 2 ? "Stable recurring income indicators detected" : "Partial financial visibility",
    params.uploadedDocuments.includes("proof_of_savings")
      ? "Savings evidence provided"
      : "Savings evidence not provided",
    params.uploadedDocuments.includes("bank_statement")
      ? "Bank history available"
      : "Limited banking history available",
  ];
  const documentChecklist = [
    { label: "ID verified", state: hasIdentityProof ? "complete" : "missing" },
    {
      label: "Income evidence received",
      state: params.uploadedDocuments.some((value) => getDocumentDefinition(value)?.category === "income")
        ? "complete"
        : "warning",
    },
    {
      label: "Financial evidence depth",
      state: params.uploadedDocuments.includes("bank_statement") ? "complete" : "warning",
    },
    {
      label: "Landlord references",
      state: referencesUploaded > 0 ? "complete" : "warning",
    },
    {
      label: "Tax documentation",
      state: params.uploadedDocuments.includes("tax_return") ? "complete" : "missing",
    },
  ] as const;
  const rentalRiskIndicators = [
    params.uploadedDocuments.includes("relocation_contract")
      ? "International relocation case"
      : null,
    params.uploadedDocuments.includes("freelance_income")
      ? "Freelancer/self-employed profile"
      : null,
    referencesUploaded === 0 ? "No previous landlord references" : null,
    params.uploadedDocuments.includes("guarantor_documents") ? "Guarantor provided" : null,
  ].filter((item): item is string => Boolean(item));
  const missingItemsGuidance =
    byPriority("recommended").filter((value) => !uploadedSet.has(value)).length > 0
      ? "To improve confidence, additional bank statements, income continuity evidence, or landlord references are recommended."
      : "Current evidence set is sufficient for a confidence-led landlord decision.";
  const protectionSuggestions = [
    confidenceScore < 65 ? "Additional deposit recommended" : null,
    !params.uploadedDocuments.includes("guarantor_documents") && confidenceScore < 55
      ? "Guarantor recommended"
      : null,
    byPriority("recommended").filter((value) => !uploadedSet.has(value)).length > 0
      ? "Additional income verification recommended"
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
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
    optionalReceived: byCategory("optional").filter((value) => uploadedSet.has(value)),
    optionalRequested: byPriority("optional"),
    protectionSuggestions,
    recommendedMissing: byPriority("recommended").filter((value) => !uploadedSet.has(value)),
    requiredMissing: byPriority("required").filter((value) => !uploadedSet.has(value)),
    rentalRiskIndicators,
    missingDocuments,
    rentalHistoryReceived: byCategory("rental_history").filter((value) => uploadedSet.has(value)),
    recommendation,
    riskFlags: params.riskFlags ?? [],
    analystNotes:
      params.analystNotes?.trim() ||
      "No analyst note was added yet. Continue collecting missing documents for a final decision.",
  };
}

export function getWorkflowStatusLabel(params: {
  status: "pending_upload" | "documents_received" | "under_review" | "report_ready";
  uploadTokenExpiresAt?: string | null;
}) {
  if (params.status === "report_ready") {
    return "Completed";
  }
  if (params.uploadTokenExpiresAt && new Date(params.uploadTokenExpiresAt).getTime() < Date.now()) {
    return "Expired";
  }
  if (params.status === "pending_upload") {
    return "Waiting for tenant";
  }
  if (params.status === "documents_received") {
    return "Upload in progress";
  }
  return "Under review";
}
