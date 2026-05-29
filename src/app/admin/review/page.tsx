import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/badge";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { StatCard } from "@/components/stat-card";
import { getDemoCasePresentationCards, mergeAdminChecksWithDemo } from "@/lib/demo-data";
import { getRequestLocale } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/auth";
import { getOperationalState, getOperationalTimestamp, getVerificationChecklist } from "@/lib/operations";
import { getAdminChecks } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review Desk",
  description: "Admin review queue for SafeKey screening and rental protection workflows.",
};

const STATUS_TONE = {
  draft: "neutral",
  pending_upload: "warning",
  documents_received: "info",
  under_review: "info",
  report_ready: "success",
} as const;

export default async function AdminReviewPage() {
  const locale = await getRequestLocale();
  const isGreek = locale === "el";
  const { profile } = await requireAdmin();
  const checks = mergeAdminChecksWithDemo(await getAdminChecks());
  const demoCases = getDemoCasePresentationCards();
  const awaitingReview = checks.filter((check) => check.status !== "report_ready");
  const queue = checks.slice(0, 3);

  return (
    <main className="min-h-screen">
      <AppHeader
        homeHref="/admin/review"
        subtitle={`Admin workspace for ${profile.full_name ?? profile.email}. Review SafeKey uploads, inspect extracted text, and publish screening plus protection outcomes.`}
        title={isGreek ? "Κέντρο αξιολόγησης SafeKey" : "SafeKey review desk"}
        variant="admin"
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <section className="brand-hero grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div className="relative z-[1] space-y-4">
            <SafeKeyBrand href="/admin/review" variant="lockup" />
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#5a6980]">
              Tenant Passport Greece
            </p>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Review uploaded files, extracted metadata, and AI-ready signals in a polished SafeKey workflow
              designed for trust-heavy real estate decisions.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Open queue</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f2343]">{awaitingReview.length}</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Generated</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f2343]">
                  {checks.filter((check) => check.ai_reports).length}
                </p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Workspace</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f2343]">{checks.length}</p>
              </div>
            </div>
          </div>

          <div className="brand-visual-frame relative z-[1] p-4">
            <div className="rounded-[24px] border border-[#e2e8f0] bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6980]">Review operations</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#0f2343]">Analyst queue snapshot</h2>
                </div>
                <div className="rounded-full border border-[#dbe2eb] bg-[#f7f9fc] px-3 py-1.5 text-xs font-medium text-[#42526b]">
                  Human review active
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {queue.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-[#dbe2eb] bg-[#fbfcfe] px-4 py-8 text-sm text-slate-500">
                    No cases have entered analyst review yet.
                  </div>
                ) : (
                  queue.map((check) => {
                    const state = getOperationalState(check.status);
                    return (
                      <div className="rounded-[20px] border border-[#e2e8f0] bg-[#fbfcfe] p-4" key={check.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[#0f2343]">{check.tenant_full_name}</p>
                            <p className="text-xs leading-5 text-slate-500">
                              {check.properties?.name ?? "Property"} • {getOperationalTimestamp(check)}
                            </p>
                          </div>
                          <Badge tone={STATUS_TONE[check.status]}>{state?.analystState ?? check.status.replaceAll("_", " ")}</Badge>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Case movement</p>
                            <p className="mt-2 text-sm font-medium text-[#0f2343]">{state?.humanState ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Next analyst step</p>
                            <p className="mt-2 text-sm font-medium text-[#0f2343]">{state?.nextStep ?? "—"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[#e2e8f0] bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Greek verification scope</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getVerificationChecklist(
                      checks[0]?.requested_documents ?? [
                        "government_id",
                        "proof_of_income",
                        "employment_letter",
                        "rental_reference",
                      ],
                    ).map((item) => (
                      <span
                        className="rounded-full border border-[#dbe2eb] bg-[#fbfcfe] px-3 py-1.5 text-xs font-medium text-[#42526b]"
                        key={item}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-[20px] border border-[#e2e8f0] bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Queue conditions</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>{checks.filter((check) => check.status === "documents_received").length} case(s) pending analyst intake</p>
                    <p>{checks.filter((check) => check.status === "under_review").length} case(s) under live review</p>
                    <p>{checks.filter((check) => check.status === "report_ready").length} case(s) awaiting final handoff</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Open queue" value={String(awaitingReview.length)} hint="Cases still awaiting a SafeKey recommendation" />
          <StatCard label="All cases" value={String(checks.length)} hint="Every Tenant Passport Greece case in review" />
          <StatCard
            label="Reports delivered"
            value={String(checks.filter((check) => check.ai_reports).length)}
            hint="Cases with a generated recommendation"
          />
        </div>

        <section className="card space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Review queue</p>
            <h2 className="text-2xl font-semibold text-slate-950">Cases requiring attention</h2>
          </div>

          <div className="space-y-4">
            {checks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                No Tenant Passport Greece cases have been created yet.
              </div>
            ) : (
              checks.map((check) => (
                <Link
                  className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-slate-300 hover:bg-white"
                  href={`/admin/review/${check.id}`}
                  key={check.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-950">{check.tenant_full_name}</h3>
                      <p className="text-sm text-slate-600">
                        {check.properties?.name ?? "Property"} • {check.properties?.city ?? "Greece"} • Created{" "}
                        {formatDate(check.created_at)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[check.status]}>{check.status.replaceAll("_", " ")}</Badge>
                  </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Analyst state</p>
                        <p className="mt-2 text-sm font-medium text-[#0f2343]">{getOperationalState(check.status).analystState}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Latest movement</p>
                        <p className="mt-2 text-sm font-medium text-[#0f2343]">{getOperationalTimestamp(check)}</p>
                      </div>
                    </div>

                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
                    <span>{check.tenant_documents.length} uploaded file(s)</span>
                    <span>{check.requested_documents.length} requested document(s)</span>
                    <span>
                      {check.ai_reports
                        ? `${check.ai_reports.recommendation} • ${check.ai_reports.score}/100`
                        : "Report pending"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="card space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Presentation queue</p>
            <h2 className="text-2xl font-semibold text-slate-950">Presentation review cases</h2>
            <p className="text-sm leading-7 text-slate-600">
              Curated scenarios for investor and insurance-partner walkthroughs. These cases remain available
              without relying on live review data.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {demoCases.map((item) => (
              <article className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{item.label}</h3>
                  <Badge tone={item.recommendation === "approve" ? "success" : item.recommendation === "conditional" ? "warning" : "danger"}>
                    {item.recommendation.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.tenantName}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Risk score</p>
                    <p className="mt-2 text-sm font-medium text-[#0f2343]">{item.riskScore}/100</p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Protection</p>
                    <p className="mt-2 text-sm font-medium text-[#0f2343]">{item.protectionPackage}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#0f2343]" type="button">
                    Approve
                  </button>
                  <button className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#0f2343]" type="button">
                    Override protection
                  </button>
                </div>
                <Link
                  className="primary-action mt-4 min-h-12 w-full rounded-[18px] px-4 py-3"
                  href={`/admin/review/${item.id}`}
                >
                  Open review case
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
