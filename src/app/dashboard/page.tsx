import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, CreditCard, Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { DashboardPresentationPanel } from "@/components/dashboard-presentation-panel";
import { DemoWalkthroughBanner } from "@/components/demo-walkthrough-banner";
import { LandlordDashboardBoard } from "@/components/landlord-dashboard-board";
import { getBillingPlanName } from "@/lib/billing";
import { getBillingOverviewForUser } from "@/lib/billing-queries";
import { mergeLandlordChecksWithDemo } from "@/lib/demo-data";
import { requireLandlord } from "@/lib/auth";
import { getLandlordChecks } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage SafeKey screening cases and launch Tenant Passport Greece checks.",
};

export default async function DashboardPage() {
  const { profile } = await requireLandlord();
  const liveChecks = await getLandlordChecks();
  const checks = mergeLandlordChecksWithDemo(liveChecks);
  const billingOverview = await getBillingOverviewForUser(profile.id);

  const completedChecks = checks.filter((check) => check.status === "report_ready");
  const pendingUploads = checks.filter((check) => check.status === "pending_upload");
  const pendingReview = checks.filter(
    (check) => check.status === "documents_received" || check.status === "under_review",
  );
  const averageScore =
    completedChecks.length > 0
      ? Math.round(
          completedChecks.reduce((total, check) => total + (check.ai_reports?.score ?? 0), 0) /
            completedChecks.length,
        )
      : null;

  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  const planLabel = getBillingPlanName(billingOverview.activeSubscription?.plan_key ?? null);
  const hasBillingPlan = Boolean(billingOverview.activeSubscription);

  return (
    <main className="min-h-screen">
      <AppHeader
        activeNav="dashboard"
        homeHref="/dashboard"
        subtitle="Screening operations, case status, and billing — in one workspace."
        title="Dashboard"
      />

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6">
        <section className="workspace-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Welcome back, {firstName}
              </h2>
              <p className="max-w-xl text-sm text-slate-600">
                {pendingReview.length > 0
                  ? `${pendingReview.length} case${pendingReview.length === 1 ? "" : "s"} need review.`
                  : pendingUploads.length > 0
                    ? `${pendingUploads.length} case${pendingUploads.length === 1 ? "" : "s"} awaiting tenant upload.`
                    : "All cases are progressing. Open the board below to take action."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a className="workspace-cta" href="#create-screening">
                <Plus className="h-4 w-4" />
                New screening
              </a>
              <Link className="workspace-cta-secondary" href="/dashboard/billing">
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Active cases", value: String(checks.length) },
              { label: "Pending review", value: String(pendingReview.length), alert: pendingReview.length > 0 },
              { label: "Awaiting upload", value: String(pendingUploads.length), alert: pendingUploads.length > 0 },
              { label: "Reports ready", value: String(completedChecks.length) },
              { label: "Avg. score", value: averageScore == null ? "—" : String(averageScore) },
            ].map((stat) => (
              <div
                className="rounded-xl border border-slate-200/90 bg-slate-50/60 px-3 py-2.5"
                key={stat.label}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-slate-950">
                  {stat.value}
                  {stat.alert ? <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> : null}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Billing</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {hasBillingPlan ? planLabel : "No active subscription"}
                {hasBillingPlan && billingOverview.activeSubscription
                  ? ` · ${billingOverview.activeSubscription.status.replaceAll("_", " ")}`
                  : ""}
              </p>
            </div>
            <Link className="workspace-cta-secondary w-full sm:w-auto" href="/dashboard/billing">
              Manage billing
            </Link>
          </div>
        </section>

        <DemoWalkthroughBanner />

        <div id="create-screening">
          <LandlordDashboardBoard checks={checks} />
        </div>

        <DashboardPresentationPanel />
      </div>
    </main>
  );
}
