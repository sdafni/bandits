import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/badge";
import { DemoWalkthroughBanner } from "@/components/demo-walkthrough-banner";
import { LandlordDashboardBoard } from "@/components/landlord-dashboard-board";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { StatCard } from "@/components/stat-card";
import { getBillingPlanName } from "@/lib/billing";
import { getBillingOverviewForUser } from "@/lib/billing-queries";
import {
  getDemoCasePresentationCards,
  getDemoDashboardAnalytics,
  getDemoPaymentHistory,
  getDemoProtectionCards,
  mergeLandlordChecksWithDemo,
} from "@/lib/demo-data";
import { requireLandlord } from "@/lib/auth";
import { getLandlordChecks } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage SafeKey screening cases and launch Tenant Passport Greece checks.",
};

const STATUS_TONE = {
  pending_upload: "warning",
  documents_received: "info",
  under_review: "info",
  report_ready: "success",
} as const;

const RECOMMENDATION_TONE = {
  approve: "success",
  conditional: "warning",
  decline: "danger",
} as const;

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export default async function DashboardPage() {
  const { profile } = await requireLandlord();
  const liveChecks = await getLandlordChecks();
  const checks = mergeLandlordChecksWithDemo(liveChecks);
  const billingOverview = await getBillingOverviewForUser(profile.id);
  const demoCases = getDemoCasePresentationCards();
  const demoAnalytics = getDemoDashboardAnalytics();
  const demoProtectionCards = getDemoProtectionCards();
  const demoPayments = getDemoPaymentHistory();

  const completedChecks = checks.filter((check) => check.status === "report_ready");
  const pendingUploads = checks.filter((check) => check.status === "pending_upload");
  const underReview = checks.filter((check) => check.status === "under_review");
  const documentsReceived = checks.filter((check) => check.tenant_documents.length > 0);
  const averageScore =
    completedChecks.length > 0
      ? Math.round(
          completedChecks.reduce((total, check) => total + (check.ai_reports?.score ?? 0), 0) /
            completedChecks.length,
        )
      : null;

  return (
    <main className="min-h-screen">
      <AppHeader
        activeNav="dashboard"
        homeHref="/dashboard"
        subtitle={`Welcome ${profile.full_name ?? profile.email}. Open tenant checks, share secure upload links, and review screening plus rental protection outcomes from one SafeKey workspace.`}
        title="SafeKey dashboard"
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <DemoWalkthroughBanner />

        <section className="brand-hero grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative z-[1] space-y-5">
            <SafeKeyBrand href="/dashboard" variant="lockup" />
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#5a6980]">
                Tenant Passport Greece
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                Run the full tenant screening flow from one landlord dashboard.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Create a case, share the secure upload link, track documents received, and review the final
                recommendation once the report is ready.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Active checks</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f2343]">{checks.length}</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Awaiting upload</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f2343]">{pendingUploads.length}</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Reports ready</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f2343]">{completedChecks.length}</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Average score</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f2343]">
                  {averageScore == null ? "--" : averageScore}
                </p>
              </div>
            </div>
          </div>

          <div className="brand-panel relative z-[1] space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5a6980]">Workflow</p>
                <h3 className="mt-1 text-xl font-semibold text-[#0f2343]">How cases move through SafeKey</h3>
              </div>
              <div className="rounded-full border border-[#dbe2eb] bg-[#f7f9fc] px-3 py-1.5 text-xs font-medium text-[#42526b]">
                Live product flow
              </div>
            </div>

            <div className="space-y-3">
              {[
                "Create a tenant check and choose the requested documents.",
                "Share the secure upload link with the applicant.",
                "Track documents received and review status changes.",
                "Open the case to review the score and recommendation.",
              ].map((item, index) => (
                <div className="flex items-start gap-3 rounded-[24px] border border-[#e2e8f0] bg-[#fbfcfe] p-4" key={item}>
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0f2343] text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[#e2e8f0] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Documents received</p>
                <p className="mt-2 text-lg font-semibold text-[#0f2343]">{documentsReceived.length} case(s)</p>
              </div>
              <div className="rounded-[20px] border border-[#e2e8f0] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Under review</p>
                <p className="mt-2 text-lg font-semibold text-[#0f2343]">{underReview.length} case(s)</p>
              </div>
            </div>
          </div>
        </section>

        <LandlordDashboardBoard checks={checks} />

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Billing</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Workspace billing status</h2>
              </div>
              <Badge tone={billingOverview.activeSubscription ? "success" : "warning"}>
                {billingOverview.activeSubscription ? billingOverview.activeSubscription.status.replaceAll("_", " ") : "No plan"}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Current plan</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {getBillingPlanName(billingOverview.activeSubscription?.plan_key ?? null)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Invoices</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{billingOverview.invoices.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">One-time screenings</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {billingOverview.recentScreeningPayments.filter((payment) => payment.status === "paid").length}
                </p>
              </div>
            </div>
          </div>

          <div className="card space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Billing workflow</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Subscriptions and pay-as-you-go</h2>
            </div>

            <div className="space-y-3">
              {[
                "Choose Basic, Pro, or Premium for subscription coverage.",
                "Use the Stripe billing portal for upgrades, downgrades, cards, and invoices.",
                "If no plan is active, pay for a single screening directly from the case detail view.",
              ].map((item) => (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700" key={item}>
                  {item}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {demoPayments.slice(0, 3).map((payment) => (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4" key={payment.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{payment.label}</p>
                    <Badge tone={payment.status === "paid" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
                      {payment.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{payment.amount}</p>
                </div>
              ))}
            </div>

            <Link className="primary-action min-h-12 w-full rounded-[18px] px-5 py-3" href="/dashboard/billing">
              Open billing workspace
            </Link>
          </div>
        </section>

        <section className="card space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Presentation portfolio</p>
            <h2 className="text-2xl font-semibold text-slate-950">Investor and insurance partner analytics</h2>
            <p className="text-sm leading-7 text-slate-600">
              Use these presentation metrics and curated cases to show how SafeKey connects screening, risk,
              eligibility, and protection packaging in one rental trust workflow.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard hint="Across the presentation portfolio" label="Active cases" value={demoAnalytics.activeCases} />
            <StatCard hint="Rentals linked to a protection package" label="Protected rentals" value={demoAnalytics.protectedRentals} />
            <StatCard hint="Average score across the presentation portfolio" label="Average risk score" value={demoAnalytics.averageRiskScore} />
            <StatCard hint="Cases that qualify for some level of partner protection" label="Eligibility rate" value={demoAnalytics.protectionEligibilityRate} />
            <StatCard hint="Portfolio documents still waiting to arrive" label="Pending documents" value={demoAnalytics.pendingDocuments} />
            <StatCard hint="Presentation cases still sitting with human review" label="Awaiting review" value={demoAnalytics.awaitingReview} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="card space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Protection Layer</p>
              <h2 className="text-2xl font-semibold text-slate-950">How SafeKey expands beyond screening</h2>
            </div>

            <div className="space-y-3">
              {[
                "Tenant Screening",
                "Risk Score",
                "Insurance Eligibility",
                "Protection Package",
              ].map((step, index) => (
                <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4" key={step}>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0f2343] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-950">{step}</p>
                  </div>
                  {index < 3 ? <span className="text-sm font-medium text-slate-400">↓</span> : null}
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
              SafeKey verifies the tenant file, produces a structured risk score, translates that score into a
              structured insurance eligibility decision, and then surfaces the most relevant protection package for
              the landlord.
            </div>
          </div>

          <div className="card space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Featured protection packages</p>
              <h2 className="text-2xl font-semibold text-slate-950">Partner-ready package cards</h2>
            </div>

            <div className="grid gap-4">
              {demoProtectionCards.map((item) => (
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={item.name}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-slate-950">{item.name}</h3>
                    <Badge tone="info">{item.estimatedPrice}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.description}</p>
                  <p className="mt-3 text-xs leading-6 text-slate-500">{item.summary}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="card space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Presentation cases</p>
            <h2 className="text-2xl font-semibold text-slate-950">Curated presentation scenarios</h2>
            <p className="text-sm leading-7 text-slate-600">
              These curated cases stay available for presentations even when the live landlord workspace is empty.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {demoCases.map((item) => (
              <article className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{item.label}</h3>
                  <Badge tone={RECOMMENDATION_TONE[item.recommendation]}>{humanize(item.recommendation)}</Badge>
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
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="primary-action min-h-12 flex-1 rounded-[18px] px-4 py-3"
                    href={`/dashboard/checks/${item.id}`}
                  >
                    View landlord report
                  </Link>
                  <Link
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#0f2343]"
                    href={`/upload/${item.uploadToken}`}
                  >
                    View upload page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
