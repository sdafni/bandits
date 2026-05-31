export type SafeKeyDocumentCategoryKey =
  | "identity"
  | "income"
  | "financial"
  | "rental_history"
  | "trust_boost"
  | "advanced";

export type SafeKeyDocumentCatalogTier = "core" | "trust_boost" | "advanced";

export type SafeKeyDocumentDefinition = {
  catalogTier: SafeKeyDocumentCatalogTier;
  category: SafeKeyDocumentCategoryKey;
  label: string;
  value: string;
};

export const SAFEKEY_DOCUMENT_CATEGORIES: Record<SafeKeyDocumentCategoryKey, { label: string }> = {
  identity: { label: "Identity" },
  income: { label: "Income" },
  financial: { label: "Financial" },
  rental_history: { label: "Rental History" },
  trust_boost: { label: "Trust Boost" },
  advanced: { label: "Advanced" },
};

/** Default recommendation catalog — landlords still choose required categories per check. */
export const SAFEKEY_DOCUMENT_DEFINITIONS: SafeKeyDocumentDefinition[] = [
  { category: "identity", catalogTier: "core", label: "Passport", value: "passport" },
  { category: "identity", catalogTier: "core", label: "National ID", value: "national_id" },
  { category: "identity", catalogTier: "core", label: "AFM", value: "afm" },
  { category: "income", catalogTier: "core", label: "Payslips", value: "payslips" },
  { category: "income", catalogTier: "core", label: "Employer Letter", value: "employer_letter" },
  { category: "financial", catalogTier: "core", label: "Bank Statement", value: "bank_statement" },
  {
    category: "rental_history",
    catalogTier: "core",
    label: "Previous Landlord Reference",
    value: "landlord_reference",
  },
  {
    category: "trust_boost",
    catalogTier: "trust_boost",
    label: "Recommendation Letter",
    value: "recommendation_letter",
  },
  {
    category: "trust_boost",
    catalogTier: "trust_boost",
    label: "Employment Contract",
    value: "employment_contract",
  },
  { category: "trust_boost", catalogTier: "trust_boost", label: "Utility Bill", value: "utility_bill" },
  {
    category: "trust_boost",
    catalogTier: "trust_boost",
    label: "Residence Permit",
    value: "residence_permit",
  },
  { category: "advanced", catalogTier: "advanced", label: "Guarantor", value: "guarantor" },
  { category: "advanced", catalogTier: "advanced", label: "Bank Guarantee", value: "bank_guarantee" },
  { category: "advanced", catalogTier: "advanced", label: "Tax Return", value: "tax_return" },
];

/** Legacy document types stored on older checks — normalized to catalog values at read time. */
export const LEGACY_DOCUMENT_TYPE_ALIASES: Record<string, string> = {
  accountant_letter: "employer_letter",
  employment_letter: "employer_letter",
  freelance_income: "payslips",
  government_id: "national_id",
  guarantor_documents: "guarantor",
  pet_documentation: "recommendation_letter",
  previous_lease_agreement: "landlord_reference",
  proof_of_income: "payslips",
  proof_of_savings: "bank_statement",
  relocation_contract: "employment_contract",
  rental_reference: "landlord_reference",
  residency_permit: "residence_permit",
  supporting_document: "recommendation_letter",
  visa_documents: "residence_permit",
};

export const IDENTITY_PRIMARY_REQUIREMENT_GROUP = {
  alternatives: ["passport", "national_id"] as const,
  id: "identity_primary",
  label: "Passport or National ID",
};

export type SafeKeyRequiredSlot =
  | { documentType: string; kind: "document" }
  | { documentTypes: string[]; groupId: string; kind: "any_of"; label: string };

export function normalizeDocumentType(documentType: string) {
  return LEGACY_DOCUMENT_TYPE_ALIASES[documentType] ?? documentType;
}

export function normalizeRequestedDocuments(requestedDocuments: string[]) {
  return requestedDocuments.map(normalizeDocumentType);
}

export function normalizeUploadedDocumentTypes(
  documents: Array<{ document_type: string; upload_status?: string | null }>,
) {
  return new Set(
    documents
      .filter((document) => document.upload_status !== "rejected")
      .map((document) => normalizeDocumentType(document.document_type)),
  );
}

export function getCatalogDocumentDefinition(value: string) {
  const normalized = normalizeDocumentType(value);
  return SAFEKEY_DOCUMENT_DEFINITIONS.find((item) => item.value === normalized) ?? null;
}

export function getCatalogDocumentLabel(value: string) {
  return getCatalogDocumentDefinition(value)?.label ?? value.replaceAll("_", " ");
}

/** Curated core pack pre-selected when landlords create a new check. */
export function getDefaultRecommendedDocuments() {
  return ["national_id", "afm", "payslips", "employer_letter", "bank_statement", "landlord_reference"];
}

export function buildRequiredSlots(requestedDocuments: string[]): SafeKeyRequiredSlot[] {
  const normalized = normalizeRequestedDocuments(requestedDocuments);
  const requestedSet = new Set(normalized);
  const slots: SafeKeyRequiredSlot[] = [];
  const consumed = new Set<string>();

  const identityRequested = IDENTITY_PRIMARY_REQUIREMENT_GROUP.alternatives.filter((documentType) =>
    requestedSet.has(documentType),
  );

  if (identityRequested.length > 0) {
    slots.push({
      documentTypes: [...identityRequested],
      groupId: IDENTITY_PRIMARY_REQUIREMENT_GROUP.id,
      kind: "any_of",
      label:
        identityRequested.length === 1
          ? getCatalogDocumentLabel(identityRequested[0])
          : IDENTITY_PRIMARY_REQUIREMENT_GROUP.label,
    });
    for (const documentType of identityRequested) {
      consumed.add(documentType);
    }
  }

  for (const documentType of normalized) {
    if (consumed.has(documentType)) {
      continue;
    }
    slots.push({ documentType, kind: "document" });
  }

  return slots;
}

export function getSlotDocumentTypes(slot: SafeKeyRequiredSlot) {
  return slot.kind === "document" ? [slot.documentType] : slot.documentTypes;
}

export function isRequiredSlotReceived(slot: SafeKeyRequiredSlot, uploadedTypes: Set<string>) {
  if (slot.kind === "document") {
    return uploadedTypes.has(slot.documentType);
  }

  return slot.documentTypes.some((documentType) => uploadedTypes.has(documentType));
}

export function getReceivedTypesForSlot(slot: SafeKeyRequiredSlot, uploadedTypes: Set<string>) {
  return getSlotDocumentTypes(slot).filter((documentType) => uploadedTypes.has(documentType));
}

export function evaluateRequiredDocumentSlots(params: {
  requested_documents: string[];
  tenant_documents: Array<{ document_type: string }>;
}) {
  const uploadedTypes = normalizeUploadedDocumentTypes(params.tenant_documents);
  const slots = buildRequiredSlots(params.requested_documents);
  const receivedDocumentTypes: string[] = [];
  const missingDocumentTypes: string[] = [];

  for (const slot of slots) {
    const receivedForSlot = getReceivedTypesForSlot(slot, uploadedTypes);
    if (receivedForSlot.length > 0) {
      receivedDocumentTypes.push(...receivedForSlot);
      continue;
    }

    if (slot.kind === "any_of") {
      missingDocumentTypes.push(slot.label);
    } else {
      missingDocumentTypes.push(slot.documentType);
    }
  }

  const receivedCount = slots.filter((slot) => isRequiredSlotReceived(slot, uploadedTypes)).length;
  const totalCount = slots.length;
  const missingCount = totalCount - receivedCount;
  const completionPercent = totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0;

  return {
    completionPercent,
    missing: missingCount,
    missingDocumentTypes,
    received: receivedCount,
    receivedDocumentTypes: [...new Set(receivedDocumentTypes)],
    slots,
    total: totalCount,
    uploadedTypes,
  };
}

export function isRequiredDocumentSubmissionComplete(
  requestedDocuments: string[],
  tenantDocuments: Array<{ document_type: string }>,
) {
  const evaluation = evaluateRequiredDocumentSlots({
    requested_documents: requestedDocuments,
    tenant_documents: tenantDocuments,
  });

  return evaluation.total > 0 && evaluation.missing === 0;
}

export function getPendingUploadDocumentTypes(
  requestedDocuments: string[],
  tenantDocuments: Array<{ document_type: string }>,
) {
  const uploadedTypes = normalizeUploadedDocumentTypes(tenantDocuments);
  const slots = buildRequiredSlots(requestedDocuments);
  const pending = new Set<string>();

  for (const slot of slots) {
    if (isRequiredSlotReceived(slot, uploadedTypes)) {
      continue;
    }

    for (const documentType of getSlotDocumentTypes(slot)) {
      pending.add(documentType);
    }
  }

  return [...pending];
}
