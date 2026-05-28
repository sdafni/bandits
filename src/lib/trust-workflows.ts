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
};

export const TRUST_DOCUMENT_CATEGORIES: Record<TrustDocumentCategoryKey, { label: string }> = {
  identity: { label: "Identity" },
  income: { label: "Income" },
  financial: { label: "Financial" },
  rental_history: { label: "Rental history" },
  optional: { label: "Optional" },
};

export const TRUST_DOCUMENT_DEFINITIONS: TrustDocumentDefinition[] = [
  { category: "identity", label: "Passport", value: "passport" },
  { category: "identity", label: "National ID", value: "national_id" },
  { category: "identity", label: "Residency permit", value: "residency_permit" },
  { category: "income", label: "Payslips", value: "payslips" },
  { category: "income", label: "Employment contract", value: "employment_contract" },
  { category: "income", label: "Tax return", value: "tax_return" },
  { category: "income", label: "Accountant letter", value: "accountant_letter" },
  { category: "financial", label: "Bank statements", value: "bank_statement" },
  { category: "financial", label: "Proof of savings", value: "proof_of_savings" },
  { category: "rental_history", label: "Previous landlord reference", value: "landlord_reference" },
  { category: "rental_history", label: "Previous lease agreement", value: "previous_lease_agreement" },
  { category: "optional", label: "Guarantor documents", value: "guarantor_documents" },
  { category: "optional", label: "Visa documents", value: "visa_documents" },
  { category: "optional", label: "Pet documentation", value: "pet_documentation" },
];

const BASIC_REQUIRED_DOCUMENTS = ["national_id", "payslips", "bank_statement"] as const;

const PRO_REQUIRED_DOCUMENTS = [
  "national_id",
  "passport",
  "payslips",
  "employment_contract",
  "tax_return",
  "bank_statement",
  "landlord_reference",
  "guarantor_documents",
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
  const requestedSet = new Set(params.requestedDocuments);
  const uploadedSet = new Set(params.uploadedDocuments);
  const missingDocuments = params.requestedDocuments.filter((value) => !uploadedSet.has(value));
  const byCategory = (category: TrustDocumentCategoryKey) =>
    params.requestedDocuments.filter((value) => getDocumentDefinition(value)?.category === category);

  const recommendation =
    params.score != null && params.score < 45
      ? "HIGH RISK"
      : params.recommendation === "approve"
        ? "APPROVE"
        : params.recommendation === "conditional"
          ? "CONDITIONAL"
          : params.recommendation === "decline"
            ? "DECLINE"
            : "CONDITIONAL";

  return {
    identityReceived: byCategory("identity").filter((value) => uploadedSet.has(value)),
    incomeReceived: byCategory("income").filter((value) => uploadedSet.has(value)),
    financialReceived: byCategory("financial").filter((value) => uploadedSet.has(value)),
    missingDocuments,
    optionalRequested: byCategory("optional").filter((value) => requestedSet.has(value)),
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
