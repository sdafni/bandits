import type { Database } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { buildSafeKeyScoreboard, type SafeKeyScoreboard, type SafeKeyTrustLevel } from "@/lib/safekey-scoreboard";
import { getCatalogDocumentLabel } from "@/lib/safekey-document-catalog";

type TenantCheckRow = Database["public"]["Tables"]["tenant_checks"]["Row"];
type TenantProfileRow = Database["public"]["Tables"]["tenant_public_profiles"]["Row"] | null;
type AiReportRow = Database["public"]["Tables"]["ai_reports"]["Row"] | null;
type TenantDocumentRow = Database["public"]["Tables"]["tenant_documents"]["Row"];
type PropertyRow = Database["public"]["Tables"]["properties"]["Row"] | null;

export type LandlordDecision = "pending" | "approved" | "declined" | "conditional";

export type CaseReviewerNote = {
  authorRole: "admin" | "landlord";
  body: string;
  createdAt: string;
  id: string;
};

export type TenantSummaryCard = {
  completionPercent: number;
  creditReportConsent: boolean;
  employmentStatus: string | null;
  landlordDecision: LandlordDecision;
  missingCategories: string[];
  monthlyIncome: string | null;
  monthlyRent: string | null;
  propertyName: string;
  reportRecommendation: string | null;
  reportScore: number | null;
  scoreboard: SafeKeyScoreboard;
  status: TenantCheckRow["status"];
  tenantEmail: string | null;
  tenantName: string;
  tenantPhone: string | null;
  trustLevel: SafeKeyTrustLevel;
};

export type SafeKeyCoreContext = {
  canManageDocuments: boolean;
  canRecordDecision: boolean;
  canRejectDocuments: boolean;
  canReviewDocuments: boolean;
  canWriteReviewerNotes: boolean;
  isAdmin: boolean;
};

export function resolveSafeKeyCoreContext(params: {
  isAdmin: boolean;
  status: TenantCheckRow["status"];
  hasReport: boolean;
}): SafeKeyCoreContext {
  return {
    canManageDocuments: params.isAdmin || params.status !== "draft",
    canRecordDecision: params.hasReport && params.status === "report_ready",
    canRejectDocuments: params.status !== "draft" && params.status !== "pending_upload",
    canReviewDocuments: params.status !== "draft" && params.status !== "pending_upload",
    canWriteReviewerNotes: true,
    isAdmin: params.isAdmin,
  };
}

export function buildTenantSummaryCard(params: {
  aiReport?: AiReportRow;
  check: Pick<
    TenantCheckRow,
    | "document_requirements"
    | "landlord_decision"
    | "requested_documents"
    | "status"
    | "tenant_email"
    | "tenant_full_name"
    | "tenant_phone"
  >;
  profile: TenantProfileRow;
  property: PropertyRow;
  tenantDocuments: TenantDocumentRow[];
}): TenantSummaryCard {
  const scoreboard = buildSafeKeyScoreboard({
    document_requirements: params.check.document_requirements,
    requested_documents: params.check.requested_documents,
    status: params.check.status,
    tenant_documents: params.tenantDocuments,
  });

  return {
    completionPercent: scoreboard.uploadCompletionPercent,
    creditReportConsent: Boolean(params.profile?.credit_report_consent),
    employmentStatus: params.profile?.employment_status ?? null,
    landlordDecision: (params.check.landlord_decision as LandlordDecision | undefined) ?? "pending",
    missingCategories: scoreboard.missingDocumentTypes.map(getCatalogDocumentLabel),
    monthlyIncome:
      params.profile?.monthly_income != null ? formatCurrency(Number(params.profile.monthly_income)) : null,
    monthlyRent:
      params.property?.monthly_rent != null ? formatCurrency(Number(params.property.monthly_rent)) : null,
    propertyName: params.property?.name ?? "Property",
    reportRecommendation: params.aiReport?.recommendation ?? null,
    reportScore: params.aiReport?.score ?? null,
    scoreboard,
    status: params.check.status,
    tenantEmail: params.check.tenant_email,
    tenantName: params.check.tenant_full_name,
    tenantPhone: params.check.tenant_phone,
    trustLevel: scoreboard.trustLevel,
  };
}

export function getRejectableDocuments(documents: TenantDocumentRow[]) {
  return documents.filter((document) => document.upload_status !== "rejected");
}

export function getRejectedDocuments(documents: TenantDocumentRow[]) {
  return documents.filter((document) => document.upload_status === "rejected");
}

export function canRequestMissingDocuments(status: TenantCheckRow["status"]) {
  return status !== "draft";
}
