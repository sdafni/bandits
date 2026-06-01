import {
  getAcceptedDocumentTypes,
  getPendingUploadDocumentTypesForReview,
  resolveSlotReviewStatus,
  slotReviewStatusCountsAsComplete,
  slotReviewStatusCountsAsTenantSubmitted,
  type TenantDocumentReviewRow,
} from "@/lib/document-review";

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

export type DocumentPriority = "required" | "recommended" | "optional";

export type DocumentRequirement = {
  documentType: string;
  priority: DocumentPriority;
  /** Reviewer waived this required category — counts as complete for submission. */
  waived?: boolean;
};

export type DocumentPlanEvaluation = {
  completionPercent: number;
  missing: number;
  missingDocumentTypes: string[];
  missingRecommended: number;
  missingRequired: number;
  optionalReceived: number;
  optionalTotal: number;
  received: number;
  receivedDocumentTypes: string[];
  recommendedReceived: number;
  recommendedTotal: number;
  requiredReceived: number;
  requiredTotal: number;
  slots: SafeKeyRequiredSlot[];
  submissionComplete: boolean;
  total: number;
  trustCompletionPercent: number;
  uploadedTypes: Set<string>;
};

export type SafeKeyRequiredSlot =
  | { documentType: string; kind: "document"; priority: DocumentPriority }
  | { documentTypes: string[]; groupId: string; kind: "any_of"; label: string; priority: DocumentPriority };

const PRIORITY_RANK: Record<DocumentPriority, number> = {
  required: 3,
  recommended: 2,
  optional: 1,
};

/** Greece rental defaults — landlords can override per check after link creation. */
export const DEFAULT_DOCUMENT_PRIORITIES: Record<string, DocumentPriority> = {
  afm: "required",
  bank_guarantee: "optional",
  bank_statement: "required",
  employer_letter: "recommended",
  employment_contract: "recommended",
  guarantor: "optional",
  landlord_reference: "recommended",
  national_id: "required",
  passport: "required",
  payslips: "required",
  recommendation_letter: "optional",
  residence_permit: "recommended",
  tax_return: "optional",
  utility_bill: "optional",
};

export function normalizeDocumentType(documentType: string) {
  return LEGACY_DOCUMENT_TYPE_ALIASES[documentType] ?? documentType;
}

export function normalizeRequestedDocuments(requestedDocuments: string[]) {
  const normalized: string[] = [];

  for (const documentType of requestedDocuments) {
    const value = normalizeDocumentType(documentType);
    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }

  return normalized;
}

export function normalizeUploadedDocumentTypes(
  documents: Array<{ document_type: string; upload_status?: string | null }>,
) {
  return getAcceptedDocumentTypes(documents);
}

function isRequirementWaivedForSlot(
  slot: SafeKeyRequiredSlot,
  requirements: DocumentRequirement[],
) {
  const waivedTypes = new Set(
    requirements.filter((requirement) => requirement.waived).map((requirement) => requirement.documentType),
  );

  return getSlotDocumentTypes(slot).some((documentType) => waivedTypes.has(normalizeDocumentType(documentType)));
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

export function getDefaultDocumentRequirementPriority(documentType: string): DocumentPriority {
  const normalized = normalizeDocumentType(documentType);
  return DEFAULT_DOCUMENT_PRIORITIES[normalized] ?? "recommended";
}

export function getDefaultDocumentRequirements(): DocumentRequirement[] {
  return getDefaultRecommendedDocuments().map((documentType) => ({
    documentType,
    priority: getDefaultDocumentRequirementPriority(documentType),
  }));
}

export function migrateRequestedDocumentsToRequirements(requestedDocuments: string[]): DocumentRequirement[] {
  return dedupeDocumentRequirements(
    requestedDocuments.map((documentType) => ({
      documentType: normalizeDocumentType(documentType),
      priority: getDefaultDocumentRequirementPriority(documentType),
    })),
  );
}

export function resolveHighestPriority(priorities: DocumentPriority[]): DocumentPriority {
  return priorities.reduce<DocumentPriority>(
    (current, priority) => (PRIORITY_RANK[priority] > PRIORITY_RANK[current] ? priority : current),
    "optional",
  );
}

export function dedupeDocumentRequirements(requirements: DocumentRequirement[]): DocumentRequirement[] {
  const byType = new Map<string, DocumentRequirement>();

  for (const requirement of requirements) {
    const documentType = normalizeDocumentType(requirement.documentType);
    const existing = byType.get(documentType);

    if (!existing || PRIORITY_RANK[requirement.priority] > PRIORITY_RANK[existing.priority]) {
      byType.set(documentType, {
        documentType,
        priority: requirement.priority,
        waived: requirement.waived ?? existing?.waived,
      });
    } else if (requirement.waived) {
      byType.set(documentType, { ...existing, waived: true });
    }
  }

  return [...byType.values()];
}

export function buildRequiredSlots(requestedDocuments: string[]): SafeKeyRequiredSlot[] {
  return buildRequiredSlotsFromRequirements(migrateRequestedDocumentsToRequirements(requestedDocuments));
}

export function buildRequiredSlotsFromRequirements(requirements: DocumentRequirement[]): SafeKeyRequiredSlot[] {
  const normalizedRequirements = dedupeDocumentRequirements(requirements);
  const priorityByType = new Map(
    normalizedRequirements.map((requirement) => [requirement.documentType, requirement.priority]),
  );
  const requestedSet = new Set(priorityByType.keys());
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
      priority: resolveHighestPriority(
        identityRequested.map((documentType) => priorityByType.get(documentType) ?? "required"),
      ),
    });

    for (const documentType of identityRequested) {
      consumed.add(documentType);
    }
  }

  for (const requirement of normalizedRequirements) {
    if (consumed.has(requirement.documentType)) {
      continue;
    }

    slots.push({
      documentType: requirement.documentType,
      kind: "document",
      priority: requirement.priority,
    });
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

export function isSlotReviewComplete(
  slot: SafeKeyRequiredSlot,
  documents: TenantDocumentReviewRow[],
  requirements: DocumentRequirement[],
) {
  return slotReviewStatusCountsAsComplete(
    resolveSlotReviewStatus(slot, documents, { waived: isRequirementWaivedForSlot(slot, requirements) }),
  );
}

export function isSlotReadyForTenantSubmission(
  slot: SafeKeyRequiredSlot,
  documents: TenantDocumentReviewRow[],
  requirements: DocumentRequirement[],
) {
  return slotReviewStatusCountsAsTenantSubmitted(
    resolveSlotReviewStatus(slot, documents, { waived: isRequirementWaivedForSlot(slot, requirements) }),
  );
}

export function getReceivedTypesForSlot(slot: SafeKeyRequiredSlot, uploadedTypes: Set<string>) {
  return getSlotDocumentTypes(slot).filter((documentType) => uploadedTypes.has(documentType));
}

export function getAcceptedTypesForSlot(
  slot: SafeKeyRequiredSlot,
  documents: TenantDocumentReviewRow[],
) {
  const accepted = getAcceptedDocumentTypes(documents);
  return getSlotDocumentTypes(slot).filter((documentType) => accepted.has(normalizeDocumentType(documentType)));
}

export function evaluateRequiredDocumentSlots(params: {
  requested_documents: string[];
  tenant_documents: Array<{ document_type: string; upload_status?: string | null }>;
}) {
  return evaluateDocumentPlan({
    requirements: migrateRequestedDocumentsToRequirements(params.requested_documents),
    tenant_documents: params.tenant_documents,
  });
}

function countCompleteSlots(
  slots: SafeKeyRequiredSlot[],
  documents: TenantDocumentReviewRow[],
  requirements: DocumentRequirement[],
) {
  return slots.filter((slot) => isSlotReviewComplete(slot, documents, requirements)).length;
}

function countTenantSubmittedSlots(
  slots: SafeKeyRequiredSlot[],
  documents: TenantDocumentReviewRow[],
  requirements: DocumentRequirement[],
) {
  return slots.filter((slot) => isSlotReadyForTenantSubmission(slot, documents, requirements)).length;
}

function countAcceptedSlots(
  slots: SafeKeyRequiredSlot[],
  documents: TenantDocumentReviewRow[],
) {
  return slots.filter((slot) => getAcceptedTypesForSlot(slot, documents).length > 0).length;
}

function computeTrustCompletionPercent(params: {
  optionalReceived: number;
  optionalTotal: number;
  recommendedReceived: number;
  recommendedTotal: number;
  requiredReceived: number;
  requiredTotal: number;
}) {
  const tiers = [
    { received: params.requiredReceived, total: params.requiredTotal, weight: 0.6 },
    { received: params.recommendedReceived, total: params.recommendedTotal, weight: 0.3 },
    { received: params.optionalReceived, total: params.optionalTotal, weight: 0.1 },
  ].filter((tier) => tier.total > 0);

  if (tiers.length === 0) {
    return 0;
  }

  const totalWeight = tiers.reduce((sum, tier) => sum + tier.weight, 0);

  return Math.round(
    tiers.reduce((sum, tier) => {
      const tierPercent = tier.total > 0 ? tier.received / tier.total : 0;
      return sum + tierPercent * (tier.weight / totalWeight) * 100;
    }, 0),
  );
}

export function evaluateDocumentPlan(params: {
  requirements: DocumentRequirement[];
  tenant_documents: Array<{ document_type: string; upload_status?: string | null }>;
}): DocumentPlanEvaluation {
  const documents = params.tenant_documents as TenantDocumentReviewRow[];
  const acceptedTypes = getAcceptedDocumentTypes(documents);
  const slots = buildRequiredSlotsFromRequirements(params.requirements);
  const requiredSlots = slots.filter((slot) => slot.priority === "required");
  const recommendedSlots = slots.filter((slot) => slot.priority === "recommended");
  const optionalSlots = slots.filter((slot) => slot.priority === "optional");
  const receivedDocumentTypes: string[] = [];
  const missingDocumentTypes: string[] = [];

  for (const slot of slots) {
    const acceptedForSlot = getAcceptedTypesForSlot(slot, documents);
    if (acceptedForSlot.length > 0) {
      receivedDocumentTypes.push(...acceptedForSlot);
      continue;
    }

    if (isSlotReviewComplete(slot, documents, params.requirements)) {
      continue;
    }

    if (slot.kind === "any_of") {
      missingDocumentTypes.push(slot.label);
    } else {
      missingDocumentTypes.push(slot.documentType);
    }
  }

  const receivedCount = countCompleteSlots(slots, documents, params.requirements);
  const totalCount = slots.length;
  const missingCount = totalCount - receivedCount;
  const requiredReceived = countCompleteSlots(requiredSlots, documents, params.requirements);
  const requiredTotal = requiredSlots.length;
  const requiredSubmitted = countTenantSubmittedSlots(requiredSlots, documents, params.requirements);
  const recommendedReceived = countCompleteSlots(recommendedSlots, documents, params.requirements);
  const recommendedTotal = recommendedSlots.length;
  const optionalReceived = countCompleteSlots(optionalSlots, documents, params.requirements);
  const optionalTotal = optionalSlots.length;
  const missingRequired = requiredTotal - requiredSubmitted;
  const missingRecommended = recommendedTotal - recommendedReceived;
  const trustCompletionPercent = computeTrustCompletionPercent({
    optionalReceived: countAcceptedSlots(optionalSlots, documents),
    optionalTotal,
    recommendedReceived: countAcceptedSlots(recommendedSlots, documents),
    recommendedTotal,
    requiredReceived: countAcceptedSlots(requiredSlots, documents),
    requiredTotal,
  });

  return {
    completionPercent: totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0,
    missing: missingCount,
    missingDocumentTypes,
    missingRecommended,
    missingRequired,
    optionalReceived,
    optionalTotal,
    received: receivedCount,
    receivedDocumentTypes: [...new Set(receivedDocumentTypes)],
    recommendedReceived,
    recommendedTotal,
    requiredReceived,
    requiredTotal,
    slots,
    submissionComplete: requiredTotal > 0 && requiredSubmitted === requiredTotal,
    total: totalCount,
    trustCompletionPercent,
    uploadedTypes: acceptedTypes,
  };
}

export function isRequiredDocumentSubmissionComplete(
  requestedDocuments: string[],
  tenantDocuments: Array<{ document_type: string; upload_status?: string | null }>,
) {
  return evaluateDocumentPlan({
    requirements: migrateRequestedDocumentsToRequirements(requestedDocuments),
    tenant_documents: tenantDocuments,
  }).submissionComplete;
}

export function isDocumentPlanSubmissionComplete(
  requirements: DocumentRequirement[],
  tenantDocuments: Array<{ document_type: string; upload_status?: string | null }>,
) {
  return evaluateDocumentPlan({ requirements, tenant_documents: tenantDocuments }).submissionComplete;
}

export function getPendingUploadDocumentTypes(
  requestedDocuments: string[],
  tenantDocuments: Array<{ document_type: string; upload_status?: string | null }>,
) {
  return getPendingUploadDocumentTypesFromRequirements(
    migrateRequestedDocumentsToRequirements(requestedDocuments),
    tenantDocuments,
  );
}

export function getPendingUploadDocumentTypesFromRequirements(
  requirements: DocumentRequirement[],
  tenantDocuments: Array<{ document_type: string; upload_status?: string | null }>,
) {
  const slots = buildRequiredSlotsFromRequirements(requirements);
  return getPendingUploadDocumentTypesForReview({
    documents: tenantDocuments as TenantDocumentReviewRow[],
    requirements,
    slots,
  });
}

export function getUploadRowsFromRequirements(requirements: DocumentRequirement[]) {
  const slots = buildRequiredSlotsFromRequirements(requirements);

  return slots.map((slot) => ({
    documentTypes: getSlotDocumentTypes(slot),
    label: slot.kind === "any_of" ? slot.label : getCatalogDocumentLabel(slot.documentType),
    priority: slot.priority,
    slot,
  }));
}
