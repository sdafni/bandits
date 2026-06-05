import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  buildRequiredSlotsFromRequirements,
  dedupeDocumentRequirements,
  evaluateDocumentPlan,
  getDefaultDocumentRequirements,
  mergeVoluntaryTrustBoostRequirements,
  migrateRequestedDocumentsToRequirements,
  normalizeDocumentType,
  normalizeRequestedDocuments,
  type DocumentPlanEvaluation,
  type DocumentPriority,
  type DocumentRequirement,
} from "@/lib/safekey-document-catalog";

export type { DocumentPriority, DocumentRequirement, DocumentPlanEvaluation };

export type CheckDocumentPlan = {
  requirements: DocumentRequirement[];
  requestedDocuments: string[];
};

type CheckDocumentSource = {
  document_requirements?: Database["public"]["Tables"]["tenant_checks"]["Row"]["document_requirements"];
  requested_documents: string[];
};

export function resolveCheckDocumentPlan(check: CheckDocumentSource): CheckDocumentPlan {
  const parsedRequirements = parseStoredDocumentRequirements(check.document_requirements);
  const normalizedRequestedDocuments = normalizeRequestedDocuments(check.requested_documents);

  const baseRequirements =
    parsedRequirements.length > 0
      ? dedupeDocumentRequirements(parsedRequirements)
      : migrateRequestedDocumentsToRequirements(normalizedRequestedDocuments);
  const requirements = mergeVoluntaryTrustBoostRequirements(baseRequirements);

  return {
    requirements,
    requestedDocuments: requirements.map((requirement) => requirement.documentType),
  };
}

export function parseStoredDocumentRequirements(raw: unknown): DocumentRequirement[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const requirements: DocumentRequirement[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const documentType =
      "documentType" in entry && typeof entry.documentType === "string"
        ? entry.documentType
        : "document_type" in entry && typeof entry.document_type === "string"
          ? entry.document_type
          : null;
    const priority =
      "priority" in entry && isDocumentPriority(entry.priority) ? entry.priority : "required";
    const waived = "waived" in entry && entry.waived === true;

    if (!documentType) {
      continue;
    }

    requirements.push({ documentType, priority, ...(waived ? { waived: true } : {}) });
  }

  return requirements;
}

export function isDocumentPriority(value: unknown): value is DocumentPriority {
  return value === "required" || value === "recommended" || value === "optional";
}

export function serializeDocumentRequirements(requirements: DocumentRequirement[]) {
  return dedupeDocumentRequirements(requirements).map((requirement) => ({
    documentType: requirement.documentType,
    priority: requirement.priority,
    ...(requirement.waived ? { waived: true } : {}),
  }));
}

export function evaluateCheckDocumentPlan(params: {
  plan: CheckDocumentPlan;
  tenant_documents: Array<{ document_type: string; upload_status?: string | null }>;
}): DocumentPlanEvaluation {
  return evaluateDocumentPlan({
    requirements: params.plan.requirements,
    tenant_documents: params.tenant_documents,
  });
}

export function buildSlotsForPlan(plan: CheckDocumentPlan) {
  return buildRequiredSlotsFromRequirements(plan.requirements);
}

export { getDefaultDocumentRequirements, migrateRequestedDocumentsToRequirements };

function isMissingDocumentRequirementsColumn(errorMessage: string) {
  return /document_requirements/i.test(errorMessage) && /does not exist|column/i.test(errorMessage);
}

export async function persistCheckDocumentRequirements(
  admin: SupabaseClient<Database>,
  checkId: string,
  requirements: DocumentRequirement[],
  extra?: Record<string, unknown>,
) {
  const requested_documents = requirements.map((requirement) => requirement.documentType);
  const payload = {
    ...extra,
    document_requirements: serializeDocumentRequirements(requirements),
    requested_documents,
  };

  const result = await admin.from("tenant_checks").update(payload).eq("id", checkId);

  if (result.error && isMissingDocumentRequirementsColumn(result.error.message)) {
    const { document_requirements: _removed, ...fallback } = payload;
    return admin.from("tenant_checks").update({ ...fallback, requested_documents }).eq("id", checkId);
  }

  return result;
}
