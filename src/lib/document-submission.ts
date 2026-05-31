import {
  evaluateRequiredDocumentSlots,
  isRequiredDocumentSubmissionComplete,
  normalizeUploadedDocumentTypes,
} from "@/lib/safekey-document-catalog";

export function getDocumentUploadFieldName(documentType: string) {
  return `documents_${documentType}`;
}

export function getUploadedDocumentTypes(documents: Array<{ document_type: string }>) {
  return normalizeUploadedDocumentTypes(documents);
}

export function getMissingRequestedDocumentTypes(
  requestedDocuments: string[],
  uploadedTypes: Set<string>,
) {
  const evaluation = evaluateRequiredDocumentSlots({
    requested_documents: requestedDocuments,
    tenant_documents: [...uploadedTypes].map((document_type) => ({ document_type })),
  });

  return evaluation.missingDocumentTypes;
}

export function countReceivedDocuments(requestedDocuments: string[], uploadedTypes: Set<string>) {
  if (requestedDocuments.length === 0) {
    return 0;
  }

  return evaluateRequiredDocumentSlots({
    requested_documents: requestedDocuments,
    tenant_documents: [...uploadedTypes].map((document_type) => ({ document_type })),
  }).received;
}

export function isDocumentSubmissionComplete(
  requestedDocuments: string[],
  uploadedTypes: Set<string>,
) {
  return isRequiredDocumentSubmissionComplete(
    requestedDocuments,
    [...uploadedTypes].map((document_type) => ({ document_type })),
  );
}

export type DocumentCollectionPhase =
  | "waiting_for_documents"
  | "partial_submission"
  | "documents_complete"
  | "under_review"
  | "report_ready";

export function resolveDocumentCollectionPhase(params: {
  requested_documents: string[];
  status: string;
  tenant_documents: Array<{ document_type: string }>;
}): {
  missing: number;
  phase: DocumentCollectionPhase;
  received: number;
  total: number;
} {
  const evaluation = evaluateRequiredDocumentSlots({
    requested_documents: params.requested_documents,
    tenant_documents: params.tenant_documents,
  });

  if (params.status === "report_ready") {
    return {
      phase: "report_ready",
      received: evaluation.received,
      total: evaluation.total,
      missing: evaluation.missing,
    };
  }

  if (params.status === "under_review") {
    return {
      phase: "under_review",
      received: evaluation.received,
      total: evaluation.total,
      missing: evaluation.missing,
    };
  }

  if (isRequiredDocumentSubmissionComplete(params.requested_documents, params.tenant_documents)) {
    return {
      phase: "documents_complete",
      received: evaluation.received,
      total: evaluation.total,
      missing: 0,
    };
  }

  if (evaluation.received > 0) {
    return {
      phase: "partial_submission",
      received: evaluation.received,
      total: evaluation.total,
      missing: evaluation.missing,
    };
  }

  return {
    phase: "waiting_for_documents",
    received: evaluation.received,
    total: evaluation.total,
    missing: evaluation.total,
  };
}
