import {
  getCatalogDocumentLabel,
  getSlotDocumentTypes,
  normalizeDocumentType,
  type SafeKeyRequiredSlot,
} from "@/lib/safekey-document-catalog";

export const DOCUMENT_REVIEW_STATUSES = [
  "accepted",
  "rejected",
  "needs_replacement",
  "not_requested",
  "pending_review",
] as const;

export type DocumentReviewStatus = (typeof DOCUMENT_REVIEW_STATUSES)[number];

export type TenantDocumentReviewRow = {
  created_at?: string | null;
  document_type: string;
  file_name?: string | null;
  id?: string;
  review_note?: string | null;
  rejection_reason?: string | null;
  upload_status?: string | null;
};

export type SlotReviewStatus =
  | "accepted"
  | "missing"
  | "needs_replacement"
  | "not_requested"
  | "pending_review"
  | "waived";

const LEGACY_STATUS_MAP: Record<string, DocumentReviewStatus> = {
  processing: "pending_review",
  reviewed: "accepted",
  uploaded: "pending_review",
};

export function normalizeDocumentReviewStatus(value: string | null | undefined): DocumentReviewStatus {
  if (!value) {
    return "pending_review";
  }

  if (DOCUMENT_REVIEW_STATUSES.includes(value as DocumentReviewStatus)) {
    return value as DocumentReviewStatus;
  }

  return LEGACY_STATUS_MAP[value] ?? "pending_review";
}

export function getDocumentReviewNote(document: TenantDocumentReviewRow) {
  return document.review_note?.trim() || document.rejection_reason?.trim() || null;
}

export function slotReviewStatusCountsAsComplete(status: SlotReviewStatus) {
  return status === "accepted" || status === "waived";
}

/** Tenant may submit when required categories are uploaded and awaiting review (or already accepted). */
export function slotReviewStatusCountsAsTenantSubmitted(status: SlotReviewStatus) {
  return (
    status === "accepted" ||
    status === "waived" ||
    status === "pending_review" ||
    status === "not_requested"
  );
}

export function documentReviewStatusAllowsReplacement(status: DocumentReviewStatus) {
  return status === "needs_replacement" || status === "rejected";
}

export function documentReviewStatusBlocksNewUpload(status: DocumentReviewStatus) {
  return status === "accepted" || status === "pending_review" || status === "not_requested";
}

export function getLatestDocumentsByType(documents: TenantDocumentReviewRow[]) {
  const latest = new Map<string, TenantDocumentReviewRow>();

  const sorted = [...documents].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return leftTime - rightTime;
  });

  for (const document of sorted) {
    latest.set(normalizeDocumentType(document.document_type), document);
  }

  return latest;
}

function resolveTypeStatus(
  documentType: string,
  latestByType: Map<string, TenantDocumentReviewRow>,
): DocumentReviewStatus | null {
  const latest = latestByType.get(normalizeDocumentType(documentType));
  if (!latest) {
    return null;
  }

  return normalizeDocumentReviewStatus(latest.upload_status);
}

function mergeSlotStatuses(statuses: Array<DocumentReviewStatus | null>): SlotReviewStatus {
  const present = statuses.filter((status): status is DocumentReviewStatus => status != null);

  if (present.length === 0) {
    return "missing";
  }

  if (present.some((status) => status === "accepted")) {
    return "accepted";
  }

  if (present.some((status) => status === "not_requested")) {
    return "not_requested";
  }

  if (present.some((status) => status === "needs_replacement" || status === "rejected")) {
    return "needs_replacement";
  }

  if (present.some((status) => status === "pending_review")) {
    return "pending_review";
  }

  return "missing";
}

export function resolveSlotReviewStatus(
  slot: SafeKeyRequiredSlot,
  documents: TenantDocumentReviewRow[],
  options?: { waived?: boolean },
): SlotReviewStatus {
  if (options?.waived) {
    return "waived";
  }

  const latestByType = getLatestDocumentsByType(documents);
  const types = getSlotDocumentTypes(slot);
  return mergeSlotStatuses(types.map((documentType) => resolveTypeStatus(documentType, latestByType)));
}

export function getAcceptedDocumentTypes(documents: TenantDocumentReviewRow[]) {
  const accepted = new Set<string>();

  for (const [documentType, document] of getLatestDocumentsByType(documents)) {
    if (normalizeDocumentReviewStatus(document.upload_status) === "accepted") {
      accepted.add(documentType);
    }
  }

  return accepted;
}

export function getReplaceableDocumentTypes(
  documents: TenantDocumentReviewRow[],
  slotDocumentTypes: string[],
) {
  const latestByType = getLatestDocumentsByType(documents);
  const replaceable = new Set<string>();

  for (const documentType of slotDocumentTypes) {
    const normalized = normalizeDocumentType(documentType);
    const latest = latestByType.get(normalized);

    if (!latest) {
      replaceable.add(normalized);
      continue;
    }

    const status = normalizeDocumentReviewStatus(latest.upload_status);
    if (documentReviewStatusAllowsReplacement(status)) {
      replaceable.add(normalized);
    }
  }

  return replaceable;
}

export function getPendingUploadDocumentTypesForReview(params: {
  documents: TenantDocumentReviewRow[];
  requirements: Array<{ documentType: string; priority: string; waived?: boolean }>;
  slots: SafeKeyRequiredSlot[];
}) {
  const waivedTypes = new Set(
    params.requirements.filter((requirement) => requirement.waived).map((requirement) => requirement.documentType),
  );
  const pending = new Set<string>();

  for (const slot of params.slots) {
    if (waivedTypes.has(slot.kind === "document" ? slot.documentType : slot.documentTypes[0])) {
      continue;
    }

    const slotStatus = resolveSlotReviewStatus(slot, params.documents, {
      waived: slot.kind === "document" ? waivedTypes.has(slot.documentType) : false,
    });

    if (slotReviewStatusCountsAsComplete(slotStatus)) {
      continue;
    }

    const types = getSlotDocumentTypes(slot);
    const replaceable = getReplaceableDocumentTypes(params.documents, types);

    if (replaceable.size > 0) {
      for (const documentType of replaceable) {
        pending.add(documentType);
      }
      continue;
    }

    if (slotStatus === "missing") {
      for (const documentType of types) {
        const normalized = normalizeDocumentType(documentType);
        const latest = getLatestDocumentsByType(params.documents).get(normalized);
        if (!latest) {
          pending.add(normalized);
        }
      }
    }
  }

  return [...pending];
}

export function formatSlotReviewLabel(slot: SafeKeyRequiredSlot, status: SlotReviewStatus) {
  if (slot.kind === "any_of") {
    return slot.label;
  }

  return getCatalogDocumentLabel(slot.documentType);
}
