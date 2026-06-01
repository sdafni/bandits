import {
  evaluateDocumentPlan,
  getPendingUploadDocumentTypesFromRequirements,
  isDocumentPlanSubmissionComplete,
  migrateRequestedDocumentsToRequirements,
  type DocumentRequirement,
} from "@/lib/safekey-document-catalog";
import { resolveCheckDocumentPlan, type CheckDocumentPlan } from "@/lib/safekey-document-plan";
import { normalizeUploadedDocumentTypes } from "@/lib/safekey-document-catalog";

export function getDocumentUploadFieldName(documentType: string) {
  return `documents_${documentType}`;
}

export function getUploadedDocumentTypes(
  documents: Array<{ document_type: string; upload_status?: string | null }>,
) {
  return normalizeUploadedDocumentTypes(documents);
}

export function getMissingRequestedDocumentTypes(
  requestedDocuments: string[],
  uploadedTypes: Set<string>,
) {
  const evaluation = evaluateDocumentPlan({
    requirements: migrateRequestedDocumentsToRequirements(requestedDocuments),
    tenant_documents: [...uploadedTypes].map((document_type) => ({ document_type })),
  });

  return evaluation.missingDocumentTypes;
}

export function countReceivedDocuments(requestedDocuments: string[], uploadedTypes: Set<string>) {
  if (requestedDocuments.length === 0) {
    return 0;
  }

  return evaluateDocumentPlan({
    requirements: migrateRequestedDocumentsToRequirements(requestedDocuments),
    tenant_documents: [...uploadedTypes].map((document_type) => ({ document_type })),
  }).received;
}

export function isDocumentSubmissionComplete(
  requestedDocuments: string[],
  uploadedTypes: Set<string>,
) {
  return isDocumentPlanSubmissionComplete(
    migrateRequestedDocumentsToRequirements(requestedDocuments),
    [...uploadedTypes].map((document_type) => ({ document_type })),
  );
}

export function isCheckDocumentPlanSubmissionComplete(
  plan: CheckDocumentPlan,
  tenantDocuments: Array<{ document_type: string; upload_status?: string | null }> | Set<string>,
) {
  const documents =
    tenantDocuments instanceof Set
      ? [...tenantDocuments].map((document_type) => ({ document_type, upload_status: "accepted" as const }))
      : tenantDocuments;

  return isDocumentPlanSubmissionComplete(plan.requirements, documents);
}

export function getPendingUploadTypesForPlan(
  plan: CheckDocumentPlan,
  tenantDocuments: Array<{ document_type: string; upload_status?: string | null }>,
) {
  return getPendingUploadDocumentTypesFromRequirements(plan.requirements, tenantDocuments);
}

export type DocumentCollectionPhase =
  | "waiting_for_documents"
  | "partial_submission"
  | "documents_complete"
  | "under_review"
  | "report_ready";

export function resolveDocumentCollectionPhase(params: {
  document_requirements?: unknown | null;
  requested_documents: string[];
  status: string;
  tenant_documents: Array<{ document_type: string; upload_status?: string | null }>;
}): {
  missing: number;
  missingRequired: number;
  phase: DocumentCollectionPhase;
  received: number;
  total: number;
} {
  const plan = resolveCheckDocumentPlan(params);
  const evaluation = evaluateDocumentPlan({
    requirements: plan.requirements,
    tenant_documents: params.tenant_documents,
  });

  if (params.status === "report_ready") {
    return {
      phase: "report_ready",
      received: evaluation.received,
      total: evaluation.total,
      missing: evaluation.missing,
      missingRequired: evaluation.missingRequired,
    };
  }

  if (params.status === "under_review") {
    return {
      phase: "under_review",
      received: evaluation.received,
      total: evaluation.total,
      missing: evaluation.missing,
      missingRequired: evaluation.missingRequired,
    };
  }

  if (isDocumentPlanSubmissionComplete(plan.requirements, params.tenant_documents)) {
    return {
      phase: "documents_complete",
      received: evaluation.received,
      total: evaluation.total,
      missing: evaluation.missing,
      missingRequired: 0,
    };
  }

  if (evaluation.received > 0) {
    return {
      phase: "partial_submission",
      received: evaluation.received,
      total: evaluation.total,
      missing: evaluation.missing,
      missingRequired: evaluation.missingRequired,
    };
  }

  return {
    phase: "waiting_for_documents",
    received: evaluation.received,
    total: evaluation.total,
    missing: evaluation.total,
    missingRequired: evaluation.missingRequired,
  };
}

export function resolveDocumentCollectionPhaseFromRequirements(params: {
  requirements: DocumentRequirement[];
  status: string;
  tenant_documents: Array<{ document_type: string; upload_status?: string | null }>;
}) {
  return resolveDocumentCollectionPhase({
    document_requirements: params.requirements.map((requirement) => ({
      documentType: requirement.documentType,
      priority: requirement.priority,
    })),
    requested_documents: params.requirements.map((requirement) => requirement.documentType),
    status: params.status,
    tenant_documents: params.tenant_documents,
  });
}
