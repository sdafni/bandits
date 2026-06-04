import { resolveDocumentCollectionPhase, type DocumentCollectionPhase } from "@/lib/document-submission";
import {
  getAcceptedTypesForSlot,
  getCatalogDocumentDefinition,
  getSlotDocumentTypes,
  normalizeDocumentType,
  type DocumentPriority,
  type SafeKeyDocumentCategoryKey,
  type SafeKeyRequiredSlot,
  SAFEKEY_DOCUMENT_CATEGORIES,
} from "@/lib/safekey-document-catalog";
import { evaluateCheckDocumentPlan, resolveCheckDocumentPlan } from "@/lib/safekey-document-plan";
import { mapSlotStatusToDisplay, type DocumentDisplayStatus } from "@/lib/document-display-status";
import { resolveSlotReviewStatus, type TenantDocumentReviewRow } from "@/lib/document-review";

export type SafeKeyTrustLevel = "incomplete" | "partial" | "good" | "ready_for_review";

export type ScoreboardItemStatus = DocumentDisplayStatus;

export type SafeKeyScoreboardItem = {
  category: SafeKeyDocumentCategoryKey | null;
  documentType: string;
  displayLabel: string;
  priority: DocumentPriority;
  reviewNote: string | null;
  slot: SafeKeyRequiredSlot;
  status: ScoreboardItemStatus;
};

export type SafeKeyScoreboard = {
  complete: boolean;
  completionPercent: number;
  items: SafeKeyScoreboardItem[];
  missing: number;
  missingDocumentTypes: string[];
  missingRecommended: number;
  missingRequired: number;
  pendingReviewDocumentTypes: string[];
  phase: DocumentCollectionPhase;
  received: number;
  receivedDocumentTypes: string[];
  requiredReceived: number;
  requiredTotal: number;
  submissionReady: boolean;
  total: number;
  approvalCompletionPercent: number;
  trustCompletionPercent: number;
  trustLevel: SafeKeyTrustLevel;
  uploadCompletionPercent: number;
};

function resolveItemCategory(slot: SafeKeyRequiredSlot): SafeKeyDocumentCategoryKey | null {
  const primaryType = slot.kind === "document" ? slot.documentType : slot.documentTypes[0];
  return getCatalogDocumentDefinition(primaryType)?.category ?? null;
}

function resolveItemDocumentType(slot: SafeKeyRequiredSlot, acceptedForSlot: string[]) {
  if (acceptedForSlot.length > 0) {
    return acceptedForSlot[0];
  }

  return slot.kind === "document" ? slot.documentType : slot.documentTypes[0];
}

function resolveItemDisplayLabel(slot: SafeKeyRequiredSlot, acceptedForSlot: string[]) {
  if (acceptedForSlot.length === 1) {
    return getCatalogDocumentDefinition(acceptedForSlot[0])?.label ?? acceptedForSlot[0];
  }

  if (slot.kind === "any_of") {
    return slot.label;
  }

  return getCatalogDocumentDefinition(slot.documentType)?.label ?? slot.documentType;
}

function mapSlotStatusToScoreboard(
  slotStatus: ReturnType<typeof resolveSlotReviewStatus>,
): ScoreboardItemStatus {
  return mapSlotStatusToDisplay(slotStatus);
}

function resolveLatestReviewNote(
  slot: SafeKeyRequiredSlot,
  documents: TenantDocumentReviewRow[],
) {
  const types = getSlotDocumentTypes(slot);
  const sorted = [...documents]
    .filter((document) => types.includes(normalizeDocumentType(document.document_type)))
    .sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      return rightTime - leftTime;
    });

  for (const document of sorted) {
    const note = document.review_note?.trim() || document.rejection_reason?.trim();
    if (note) {
      return note;
    }
  }

  return null;
}

export function buildSafeKeyScoreboard(params: {
  document_requirements?: unknown | null;
  requested_documents: string[];
  status: string;
  tenant_documents: Array<{ document_type: string; upload_status?: string | null; created_at?: string | null; review_note?: string | null; rejection_reason?: string | null }>;
}): SafeKeyScoreboard {
  const plan = resolveCheckDocumentPlan(params);
  const documents = params.tenant_documents as TenantDocumentReviewRow[];
  const evaluation = evaluateCheckDocumentPlan({
    plan,
    tenant_documents: params.tenant_documents,
  });
  const collection = resolveDocumentCollectionPhase({
    document_requirements: plan.requirements.map((requirement) => ({
      documentType: requirement.documentType,
      priority: requirement.priority,
      waived: requirement.waived,
    })),
    requested_documents: plan.requestedDocuments,
    status: params.status,
    tenant_documents: params.tenant_documents,
  });

  const items: SafeKeyScoreboardItem[] = evaluation.slots.map((slot) => {
    const acceptedForSlot = getAcceptedTypesForSlot(slot, documents);
    const slotStatus = resolveSlotReviewStatus(slot, documents, {
      waived: plan.requirements
        .filter((requirement) => requirement.waived)
        .some((requirement) =>
          getSlotDocumentTypes(slot).includes(normalizeDocumentType(requirement.documentType)),
        ),
    });

    return {
      category: resolveItemCategory(slot),
      displayLabel: resolveItemDisplayLabel(slot, acceptedForSlot),
      documentType: resolveItemDocumentType(slot, acceptedForSlot),
      priority: slot.priority,
      reviewNote: resolveLatestReviewNote(slot, documents),
      slot,
      status: mapSlotStatusToScoreboard(slotStatus),
    };
  });

  const pendingReviewDocumentTypes = items
    .filter((item) => item.status === "uploaded" || item.status === "under_review")
    .map((item) => item.documentType);

  return {
    approvalCompletionPercent: evaluation.trustCompletionPercent,
    complete:
      collection.phase === "documents_complete" ||
      collection.phase === "under_review" ||
      collection.phase === "report_ready",
    completionPercent: evaluation.completionPercent,
    items,
    missing: evaluation.missing,
    missingDocumentTypes: evaluation.missingDocumentTypes.map((value) => normalizeDocumentType(value)),
    missingRecommended: evaluation.missingRecommended,
    missingRequired: evaluation.missingRequired,
    pendingReviewDocumentTypes,
    phase: collection.phase,
    received: evaluation.received,
    receivedDocumentTypes: evaluation.receivedDocumentTypes,
    requiredReceived: evaluation.requiredReceived,
    requiredTotal: evaluation.requiredTotal,
    submissionReady: evaluation.submissionComplete,
    total: evaluation.total,
    trustCompletionPercent: evaluation.trustCompletionPercent,
    trustLevel: resolveTrustLevel(evaluation.completionPercent),
    uploadCompletionPercent: evaluation.completionPercent,
  };
}

export function resolveTrustLevel(completionPercent: number): SafeKeyTrustLevel {
  if (completionPercent >= 100) {
    return "ready_for_review";
  }
  if (completionPercent >= 80) {
    return "good";
  }
  if (completionPercent >= 50) {
    return "partial";
  }
  return "incomplete";
}

export function groupScoreboardItemsByCategory(items: SafeKeyScoreboardItem[]) {
  const grouped = new Map<SafeKeyDocumentCategoryKey, SafeKeyScoreboardItem[]>();

  for (const item of items) {
    const category = item.category ?? "advanced";
    const bucket = grouped.get(category) ?? [];
    bucket.push(item);
    grouped.set(category, bucket);
  }

  return (Object.keys(SAFEKEY_DOCUMENT_CATEGORIES) as SafeKeyDocumentCategoryKey[])
    .map((category) => ({
      category,
      items: grouped.get(category) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

export function getScoreboardSlotKey(slot: SafeKeyRequiredSlot) {
  return slot.kind === "document" ? slot.documentType : slot.groupId;
}

export { getSlotDocumentTypes };
