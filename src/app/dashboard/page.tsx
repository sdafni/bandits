import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
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

  return (
    <main className="min-h-screen bg-slate-50/50">
      <AppHeader
        activeNav="dashboard"
        homeHref="/dashboard"
        subtitle="Operational command center for tenant screening."
        title="Dashboard"
      />

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <DashboardCommandCenter
          checks={checks}
          firstName={firstName}
          hasBillingPlan={Boolean(billingOverview.activeSubscription)}
          planLabel={planLabel}
          stats={{
            active: checks.length,
            awaitingUpload: pendingUploads.length,
            averageScore,
            completed: completedChecks.length,
            pendingReview: pendingReview.length,
          }}
          subscriptionStatus={billingOverview.activeSubscription?.status ?? null}
        />

        <div id="tenant-cases">
          <LandlordDashboardBoard checks={checks} />
        </div>
      </div>
    </main>
  );
}
