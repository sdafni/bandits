import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SafeKeyTrustReport } from "@/components/safekey-trust-report";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { TrustReportPrintButton } from "@/components/trust-report-print-button";
import { requireLandlord } from "@/lib/auth";
import { resolveMonetizationAccessForCheck } from "@/lib/billing-entitlements";
import { getBillingEligibilityForCheck } from "@/lib/billing-queries";
import { getSafeBillingOverviewForUser } from "@/lib/safe-billing-overview";
import { isDemoCheckId } from "@/lib/demo-data";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { buildTrustWorkflowReport } from "@/lib/trust-workflows";
import { getLandlordCheckDetail } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { canUseCapability, resolveCaseAccess, resolveWorkspaceAccess } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

export default async function TrustReportExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(locale, key);
  const { profile } = await requireLandlord();
  const { id } = await params;
  const detail = await getLandlordCheckDetail(id);
  if (!detail) {
    notFound();
  }

  const isDemoCase = isDemoCheckId(id);
  const billingOverview = await getSafeBillingOverviewForUser(profile.id, { admin: true });
  const monetizationAccess = isDemoCase
    ? null
    : await resolveMonetizationAccessForCheck({
        checkId: id,
        landlordId: profile.id,
        useAdmin: true,
      });
  const workspaceAccess = resolveWorkspaceAccess(
    billingOverview,
    monetizationAccess
      ? { config: monetizationAccess.config, entitlements: monetizationAccess.entitlements }
      : undefined,
  );
  const billingEligibility = isDemoCase
    ? { hasBillingAccess: true }
    : await getBillingEligibilityForCheck({
        checkId: id,
        landlordId: profile.id,
        useAdmin: true,
      });

  const caseAccess = resolveCaseAccess({
    workspace: workspaceAccess,
    checkId: id,
    status: detail.status,
    workflowActivatedAt: detail.workflow_activated_at ?? null,
    hasCaseBillingAccess:
      monetizationAccess?.permissions.canViewFullReport ?? billingEligibility.hasBillingAccess,
    caseGates: monetizationAccess?.gates,
  });

  if (!canUseCapability(caseAccess, "export_trust_report")) {
    redirect(`/dashboard/checks/${id}?unlock=trust_report`);
  }

  const trustReport = buildTrustWorkflowReport({
    analystNotes:
      typeof detail.ai_reports?.reasoning === "string"
        ? detail.ai_reports.reasoning
        : detail.ai_reports?.reasoning
          ? JSON.stringify(detail.ai_reports.reasoning)
          : null,
    caseCreatedAt: detail.created_at,
    caseId: detail.id,
    consent: detail.tenant_public_profiles
      ? {
          granted: Boolean(detail.tenant_public_profiles.consent_confirmed),
          recordedAt: detail.tenant_public_profiles.updated_at,
        }
      : null,
    documentHistory: detail.tenant_documents.map((item) => ({
      documentType: item.document_type,
      fileName: item.file_name,
      uploadedAt: item.created_at,
    })),
    recommendation: detail.ai_reports?.recommendation ?? null,
    requestedDocuments: detail.requested_documents,
    reviewCompletedAt: detail.review_completed_at,
    riskFlags: detail.ai_reports?.red_flags ?? [],
    score: detail.ai_reports?.score ?? null,
    uploadedDocuments: detail.tenant_documents.map((item) => item.document_type),
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-4 print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link className="workspace-cta-secondary" href={`/dashboard/checks/${id}`}>
            {t("workspace.backToCase")}
          </Link>
          <TrustReportPrintButton />
        </div>
        <SafeKeyTrustReport caseId={id} generatedAt={formatDate(new Date().toISOString())} report={trustReport} />
        <div className="print:hidden">
          <SafeKeyBrand variant="logo" />
        </div>
      </div>
    </main>
  );
}
