import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { LandlordDashboardBoard } from "@/components/landlord-dashboard-board";
import { SignOutForm } from "@/components/sign-out-form";
import { getBillingPlanLimits, getBillingPlanName } from "@/lib/billing";
import { getBillingOverviewForUser } from "@/lib/billing-queries";
import { mergeLandlordChecksWithDemo } from "@/lib/demo-data";
import { getRequestLocale } from "@/lib/i18n-server";
import { requireLandlord } from "@/lib/auth";
import { getLandlordChecks } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage SafeKey screening cases and launch Tenant Passport Greece checks.",
};

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getWorkspaceExperience(
  planKey: "basic" | "pro" | "premium" | null,
  workspaceType: string | null,
): "basic" | "pro" | "premium" {
  if (workspaceType === "individual") {
    return "basic";
  }
  if (workspaceType === "agency") {
    return "pro";
  }
  if (workspaceType === "team") {
    return "premium";
  }

  if (planKey === "premium") {
    return "premium";
  }
  if (planKey === "pro") {
    return "pro";
  }
  return "basic";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const locale = await getRequestLocale();
  const isGreek = locale === "el";
  const { profile } = await requireLandlord();
  const resolvedSearchParams = (await searchParams) ?? {};
  const workspaceTypeValue = resolvedSearchParams.workspace_type;
  const workspaceType = typeof workspaceTypeValue === "string" ? workspaceTypeValue : null;
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

  const planKey = (billingOverview.activeSubscription?.plan_key as "basic" | "pro" | "premium" | null) ?? null;
  const experience = getWorkspaceExperience(planKey, workspaceType);
  const planLabel = getBillingPlanName(planKey);
  const limits = getBillingPlanLimits(planKey);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const completedThisMonth = checks.filter(
    (check) =>
      check.status === "report_ready" &&
      new Date((check.review_completed_at ?? check.created_at) as string).getTime() >= monthStart.getTime(),
  ).length;

  return (
    <main className="min-h-screen bg-slate-100/80">
      <AppHeader
        activeNav="dashboard"
        homeHref="/dashboard"
        locale={locale}
        subtitle={
          experience === "basic"
            ? isGreek
              ? "Απλή, ασφαλής διαχείριση ελέγχων για ιδιοκτήτες"
              : "Simple, secure screening workflow for independent landlords"
            : isFirstWorkspace
            ? isGreek
              ? "Στήσε τον πρώτο έλεγχο ενοικιαστή"
              : "Set up your first tenant screening"
            : isGreek
              ? `${liveChecks.length} ενεργές υποθέσεις · ${pendingReview.length} σε αναμονή αξιολόγησης`
              : `${liveChecks.length} active cases · ${pendingReview.length} in review queue`
        }
        title={experience === "basic" ? (isGreek ? "Ο χώρος μου" : "My workspace") : isGreek ? "Λειτουργίες" : "Operations"}
      />

      <div className="workspace-page">
        <DashboardCommandCenter
          checks={checks}
          experience={experience}
          isFirstWorkspace={isFirstWorkspace}
          isGreek={isGreek}
          planLabel={planLabel}
          planUsage={`${checks.filter((check) => check.status !== "report_ready").length}/${limits.activeChecks} active · ${completedThisMonth}/${limits.completedChecksPerMonth} monthly completed`}
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

        <LandlordDashboardBoard checks={checks} experience={experience} isFirstWorkspace={isFirstWorkspace} isGreek={isGreek} />

        <section className="workspace-card border-dashed">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {isGreek ? "Ρυθμίσεις λογαριασμού" : "Account settings"}
              </p>
              <p className="text-sm text-slate-600">
                {isGreek ? "Η αποσύνδεση βρίσκεται στο τέλος της ροής εργασίας." : "Sign out is available as a secondary action."}
              </p>
            </div>
            <SignOutForm />
          </div>
        </section>
      </div>
    </main>
  );
}
