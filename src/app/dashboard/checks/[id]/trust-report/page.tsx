import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeKeyTrustReport } from "@/components/safekey-trust-report";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { TrustReportPrintButton } from "@/components/trust-report-print-button";
import { requireLandlord } from "@/lib/auth";
import { buildTrustWorkflowReport } from "@/lib/trust-workflows";
import { getLandlordCheckDetail } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TrustReportExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const detail = await getLandlordCheckDetail(id);
  if (!detail) {
    notFound();
  }

  const trustReport = buildTrustWorkflowReport({
    analystNotes:
      typeof detail.ai_reports?.reasoning === "string"
        ? detail.ai_reports.reasoning
        : detail.ai_reports?.reasoning
          ? JSON.stringify(detail.ai_reports.reasoning)
          : null,
    recommendation: detail.ai_reports?.recommendation ?? null,
    requestedDocuments: detail.requested_documents,
    riskFlags: detail.ai_reports?.red_flags ?? [],
    score: detail.ai_reports?.score ?? null,
    uploadedDocuments: detail.tenant_documents.map((item) => item.document_type),
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-4 print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link className="workspace-cta-secondary" href={`/dashboard/checks/${id}`}>
            Back to case
          </Link>
          <TrustReportPrintButton />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 print:rounded-none print:border-0 print:p-0">
          <div className="mb-4 flex items-center justify-between">
            <SafeKeyBrand href="/" variant="compact" />
            <p className="text-xs text-slate-500">Generated {formatDate(new Date().toISOString())}</p>
          </div>
          <SafeKeyTrustReport caseId={id} generatedAt={formatDate(new Date().toISOString())} report={trustReport} />
        </section>
      </div>
    </main>
  );
}
