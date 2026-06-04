import "server-only";

import type { Database } from "@/lib/database.types";
import type { TenantCheckDetail } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export type TenantDocumentRow = Database["public"]["Tables"]["tenant_documents"]["Row"];

export async function listTenantDocumentsForCheck(checkId: string): Promise<TenantDocumentRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_documents")
    .select("*")
    .eq("tenant_check_id", checkId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load tenant documents for check ${checkId}: ${error.message}`);
  }

  return data ?? [];
}

export function assertLandlordOwnsCheck(
  detail: Pick<TenantCheckDetail, "id" | "landlord_id">,
  landlordId: string,
) {
  if (detail.landlord_id !== landlordId) {
    throw new Error("You do not have access to this tenant check.");
  }
}

export type ReportSurfaceState = {
  hasAnalysis: boolean;
  hasPdf: boolean;
  statusIsReportReady: boolean;
  /** Analysis exists but check status has not reached report_ready yet. */
  analysisAwaitingStatus: boolean;
  /** PDF not stored yet while analysis exists. */
  pdfPending: boolean;
};

export function resolveReportSurfaceState(params: {
  aiReport: Pick<
    Database["public"]["Tables"]["ai_reports"]["Row"],
    "id" | "pdf_storage_path"
  > | null;
  status: Database["public"]["Tables"]["tenant_checks"]["Row"]["status"];
}): ReportSurfaceState {
  const hasAnalysis = Boolean(params.aiReport);
  const hasPdf = Boolean(params.aiReport?.pdf_storage_path);
  const statusIsReportReady = params.status === "report_ready";

  return {
    hasAnalysis,
    hasPdf,
    statusIsReportReady,
    analysisAwaitingStatus: hasAnalysis && !statusIsReportReady,
    pdfPending: hasAnalysis && !hasPdf,
  };
}
