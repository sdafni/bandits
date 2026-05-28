import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { LandlordDashboardBoard } from "@/components/landlord-dashboard-board";
import { getBillingPlanName, isEntitledSubscriptionStatus } from "@/lib/billing";
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
  const isFirstWorkspace = liveChecks.length === 0;
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
  const elevatedRisk = checks.filter((check) => check.ai_reports != null && check.ai_reports.score < 60).length;
  const readyForDecision = completedChecks.length;

  const hasManagedSubscription = Boolean(
    billingOverview.activeSubscription &&
      isEntitledSubscriptionStatus(billingOverview.activeSubscription.status),
  );
  const planLabel = getBillingPlanName(billingOverview.activeSubscription?.plan_key ?? null);

  return (
    <main className="min-h-screen bg-slate-100/80">
      <AppHeader
        activeNav="dashboard"
        homeHref="/dashboard"
        subtitle={
          isFirstWorkspace
            ? "Set up your first tenant screening"
            : `${liveChecks.length} active cases · ${pendingReview.length} in review queue`
        }
        title="Operations"
      />

      <div className="mx-auto max-w-[1400px] space-y-2 px-3 py-3 sm:px-4 sm:py-4">
        <DashboardCommandCenter
          checks={checks}
          isFirstWorkspace={isFirstWorkspace}
          hasBillingPlan={hasManagedSubscription}
          planLabel={planLabel}
          stats={{
            active: checks.length,
            awaitingUpload: pendingUploads.length,
            averageScore,
            completed: completedChecks.length,
            elevatedRisk,
            pendingReview: pendingReview.length,
            readyForDecision,
          }}
          subscriptionStatus={billingOverview.activeSubscription?.status ?? null}
        />

        <LandlordDashboardBoard checks={checks} isFirstWorkspace={isFirstWorkspace} />
      </div>
    </main>
  );
}
