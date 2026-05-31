export function getDocumentUploadFieldName(documentType: string) {
  return `documents_${documentType}`;
}

export function getUploadedDocumentTypes(documents: Array<{ document_type: string }>) {
  return new Set(documents.map((document) => document.document_type));
}

export function getMissingRequestedDocumentTypes(
  requestedDocuments: string[],
  uploadedTypes: Set<string>,
) {
  return requestedDocuments.filter((documentType) => !uploadedTypes.has(documentType));
}

export function countReceivedDocuments(requestedDocuments: string[], uploadedTypes: Set<string>) {
  if (requestedDocuments.length === 0) {
    return 0;
  }

  return requestedDocuments.filter((documentType) => uploadedTypes.has(documentType)).length;
}

export function isDocumentSubmissionComplete(
  requestedDocuments: string[],
  uploadedTypes: Set<string>,
) {
  return (
    requestedDocuments.length > 0 &&
    getMissingRequestedDocumentTypes(requestedDocuments, uploadedTypes).length === 0
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
  const uploadedTypes = getUploadedDocumentTypes(params.tenant_documents);
  const total = params.requested_documents.length;
  const received = countReceivedDocuments(params.requested_documents, uploadedTypes);
  const missing = total - received;

  if (params.status === "report_ready") {
    return { phase: "report_ready", received, total, missing };
  }

  if (params.status === "under_review") {
    return { phase: "under_review", received, total, missing };
  }

  if (isDocumentSubmissionComplete(params.requested_documents, uploadedTypes)) {
    return { phase: "documents_complete", received, total, missing: 0 };
  }

  if (received > 0) {
    return { phase: "partial_submission", received, total, missing };
  }

  return { phase: "waiting_for_documents", received, total, missing: total };
}
