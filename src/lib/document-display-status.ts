import {
  normalizeDocumentReviewStatus,
  resolveSlotReviewStatus,
  type DocumentReviewStatus,
  type SlotReviewStatus,
  type TenantDocumentReviewRow,
} from "@/lib/document-review";
import type { SafeKeyRequiredSlot } from "@/lib/safekey-document-catalog";
import type { DocumentRequirement } from "@/lib/safekey-document-catalog";

/** Canonical document states shown to users (upload vs approval separated in copy). */
export type DocumentDisplayStatus =
  | "missing"
  | "uploaded"
  | "under_review"
  | "approved"
  | "replacement_requested"
  | "rejected"
  | "waived";

export function mapReviewStatusToDisplay(status: DocumentReviewStatus): DocumentDisplayStatus {
  switch (status) {
    case "accepted":
      return "approved";
    case "rejected":
      return "rejected";
    case "needs_replacement":
      return "replacement_requested";
    case "pending_review":
      return "uploaded";
    case "not_requested":
      return "under_review";
    default:
      return "under_review";
  }
}

export function mapSlotStatusToDisplay(status: SlotReviewStatus): DocumentDisplayStatus {
  switch (status) {
    case "accepted":
      return "approved";
    case "needs_replacement":
      return "replacement_requested";
    case "pending_review":
      return "uploaded";
    case "waived":
      return "waived";
    case "not_requested":
      return "under_review";
    case "missing":
    default:
      return "missing";
  }
}

export function getDocumentDisplayStatus(
  document: Pick<TenantDocumentReviewRow, "upload_status">,
): DocumentDisplayStatus {
  return mapReviewStatusToDisplay(normalizeDocumentReviewStatus(document.upload_status));
}

export function getSlotDisplayStatus(
  slot: SafeKeyRequiredSlot,
  documents: TenantDocumentReviewRow[],
  requirements: DocumentRequirement[],
) {
  const waived = requirements
    .filter((requirement) => requirement.waived)
    .some((requirement) =>
      (slot.kind === "document" ? [slot.documentType] : slot.documentTypes).includes(requirement.documentType),
    );

  return mapSlotStatusToDisplay(resolveSlotReviewStatus(slot, documents, { waived }));
}

/** i18n keys under documents.displayStatus.* */
export function getDocumentDisplayStatusMessageKey(status: DocumentDisplayStatus) {
  return `documents.displayStatus.${status}`;
}
