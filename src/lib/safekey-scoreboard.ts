import {
  type DocumentCollectionPhase,
  countReceivedDocuments,
  getUploadedDocumentTypes,
  resolveDocumentCollectionPhase,
} from "@/lib/document-submission";
import {
  TRUST_DOCUMENT_CATEGORIES,
  type TrustDocumentCategoryKey,
  getDocumentDefinition,
} from "@/lib/trust-workflows";

export type ScoreboardItemStatus = "received" | "missing";

export type SafeKeyScoreboardItem = {
  category: TrustDocumentCategoryKey | null;
  documentType: string;
  status: ScoreboardItemStatus;
};

export type SafeKeyScoreboard = {
  complete: boolean;
  items: SafeKeyScoreboardItem[];
  missing: number;
  missingDocumentTypes: string[];
  phase: DocumentCollectionPhase;
  received: number;
  total: number;
};

export function buildSafeKeyScoreboard(params: {
  requested_documents: string[];
  status: string;
  tenant_documents: Array<{ document_type: string }>;
}): SafeKeyScoreboard {
  const uploadedTypes = getUploadedDocumentTypes(params.tenant_documents);
  const collection = resolveDocumentCollectionPhase({
    requested_documents: params.requested_documents,
    status: params.status,
    tenant_documents: params.tenant_documents,
  });

  const items: SafeKeyScoreboardItem[] = params.requested_documents.map((documentType) => ({
    category: getDocumentDefinition(documentType)?.category ?? null,
    documentType,
    status: uploadedTypes.has(documentType) ? "received" : "missing",
  }));

  const missingDocumentTypes = items
    .filter((item) => item.status === "missing")
    .map((item) => item.documentType);

  return {
    complete: collection.phase === "documents_complete" || collection.phase === "under_review" || collection.phase === "report_ready",
    items,
    missing: collection.missing,
    missingDocumentTypes,
    phase: collection.phase,
    received: countReceivedDocuments(params.requested_documents, uploadedTypes),
    total: params.requested_documents.length,
  };
}

export function groupScoreboardItemsByCategory(items: SafeKeyScoreboardItem[]) {
  const grouped = new Map<TrustDocumentCategoryKey, SafeKeyScoreboardItem[]>();

  for (const item of items) {
    const category = item.category ?? "optional";
    const bucket = grouped.get(category) ?? [];
    bucket.push(item);
    grouped.set(category, bucket);
  }

  return (Object.keys(TRUST_DOCUMENT_CATEGORIES) as TrustDocumentCategoryKey[])
    .map((category) => ({
      category,
      items: grouped.get(category) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}
