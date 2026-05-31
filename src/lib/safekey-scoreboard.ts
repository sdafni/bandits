import { resolveDocumentCollectionPhase, type DocumentCollectionPhase } from "@/lib/document-submission";
import {
  buildRequiredSlots,
  evaluateRequiredDocumentSlots,
  getCatalogDocumentDefinition,
  getReceivedTypesForSlot,
  getSlotDocumentTypes,
  isRequiredSlotReceived,
  normalizeDocumentType,
  type SafeKeyDocumentCategoryKey,
  type SafeKeyRequiredSlot,
  SAFEKEY_DOCUMENT_CATEGORIES,
} from "@/lib/safekey-document-catalog";

export type SafeKeyTrustLevel = "incomplete" | "partial" | "good" | "ready_for_review";

export type ScoreboardItemStatus = "received" | "missing" | "pending_review";

export type SafeKeyScoreboardItem = {
  category: SafeKeyDocumentCategoryKey | null;
  documentType: string;
  displayLabel: string;
  slot: SafeKeyRequiredSlot;
  status: ScoreboardItemStatus;
};

export type SafeKeyScoreboard = {
  complete: boolean;
  completionPercent: number;
  items: SafeKeyScoreboardItem[];
  missing: number;
  missingDocumentTypes: string[];
  pendingReviewDocumentTypes: string[];
  phase: DocumentCollectionPhase;
  received: number;
  receivedDocumentTypes: string[];
  total: number;
  trustLevel: SafeKeyTrustLevel;
};

const REVIEW_PENDING_STATUSES = new Set(["documents_received", "under_review"]);

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

function resolveItemStatus(params: {
  receivedForSlot: string[];
  slotReceived: boolean;
  status: string;
}): ScoreboardItemStatus {
  if (!params.slotReceived) {
    return "missing";
  }

  if (REVIEW_PENDING_STATUSES.has(params.status)) {
    return "pending_review";
  }

  return "received";
}

function resolveItemCategory(slot: SafeKeyRequiredSlot): SafeKeyDocumentCategoryKey | null {
  const primaryType = slot.kind === "document" ? slot.documentType : slot.documentTypes[0];
  return getCatalogDocumentDefinition(primaryType)?.category ?? null;
}

function resolveItemDocumentType(slot: SafeKeyRequiredSlot, receivedForSlot: string[]) {
  if (receivedForSlot.length > 0) {
    return receivedForSlot[0];
  }

  return slot.kind === "document" ? slot.documentType : slot.documentTypes[0];
}

function resolveItemDisplayLabel(slot: SafeKeyRequiredSlot, receivedForSlot: string[]) {
  if (receivedForSlot.length === 1) {
    return getCatalogDocumentDefinition(receivedForSlot[0])?.label ?? receivedForSlot[0];
  }

  if (slot.kind === "any_of") {
    return slot.label;
  }

  return getCatalogDocumentDefinition(slot.documentType)?.label ?? slot.documentType;
}

export function buildSafeKeyScoreboard(params: {
  requested_documents: string[];
  status: string;
  tenant_documents: Array<{ document_type: string }>;
}): SafeKeyScoreboard {
  const evaluation = evaluateRequiredDocumentSlots({
    requested_documents: params.requested_documents,
    tenant_documents: params.tenant_documents,
  });
  const collection = resolveDocumentCollectionPhase({
    requested_documents: params.requested_documents,
    status: params.status,
    tenant_documents: params.tenant_documents,
  });

  const items: SafeKeyScoreboardItem[] = evaluation.slots.map((slot) => {
    const receivedForSlot = getReceivedTypesForSlot(slot, evaluation.uploadedTypes);
    const slotReceived = isRequiredSlotReceived(slot, evaluation.uploadedTypes);

    return {
      category: resolveItemCategory(slot),
      displayLabel: resolveItemDisplayLabel(slot, receivedForSlot),
      documentType: resolveItemDocumentType(slot, receivedForSlot),
      slot,
      status: resolveItemStatus({
        receivedForSlot,
        slotReceived,
        status: params.status,
      }),
    };
  });

  const pendingReviewDocumentTypes =
    params.status === "report_ready"
      ? []
      : REVIEW_PENDING_STATUSES.has(params.status)
        ? evaluation.receivedDocumentTypes
        : [];

  return {
    complete:
      collection.phase === "documents_complete" ||
      collection.phase === "under_review" ||
      collection.phase === "report_ready",
    completionPercent: evaluation.completionPercent,
    items,
    missing: evaluation.missing,
    missingDocumentTypes: evaluation.missingDocumentTypes.map((value) => normalizeDocumentType(value)),
    pendingReviewDocumentTypes,
    phase: collection.phase,
    received: evaluation.received,
    receivedDocumentTypes: evaluation.receivedDocumentTypes,
    total: evaluation.total,
    trustLevel: resolveTrustLevel(evaluation.completionPercent),
  };
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
