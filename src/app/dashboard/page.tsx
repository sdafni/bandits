import type { Metadata } from "next";
import { DashboardTierView } from "@/components/dashboard/dashboard-tier-view";
import { DashboardWorkspaceShell } from "@/components/dashboard-workspace-shell";
import { mergeLandlordChecksWithDemo } from "@/lib/demo-data";
import { buildDashboardStats } from "@/lib/dashboard-stats";
import { resolveDashboardTier } from "@/lib/dashboard-tier";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { requireLandlord } from "@/lib/auth";
import { getLandlordChecks } from "@/lib/queries";
import { getSafeBillingOverviewForUser } from "@/lib/safe-billing-overview";
import { resolveWorkspaceAccess } from "@/lib/workspace-access";
import { getStripeProductionReadiness } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: translate(locale, "dashboard.title"),
    description: translate(locale, "dashboard.subtitle"),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { profile } = await requireLandlord();
  const params = await searchParams;
  const autoStartCheck = params.start === "check";

  let liveChecks: Awaited<ReturnType<typeof getLandlordChecks>> = [];
  try {
    liveChecks = await getLandlordChecks();
  } catch {
    liveChecks = [];
  }

  const checks = mergeLandlordChecksWithDemo(liveChecks);
  const billingOverview = await getSafeBillingOverviewForUser(profile.id);
  const stripeReadiness = getStripeProductionReadiness();
  const billingNavEnabled = stripeReadiness.isCheckoutReady && billingOverview.schemaReady;
  const workspaceAccess = resolveWorkspaceAccess(billingOverview);
  const tier = resolveDashboardTier(workspaceAccess);
  const stats = buildDashboardStats(checks, workspaceAccess.limits);

  return (
    <main className="min-h-screen bg-slate-100/80">
      <DashboardWorkspaceShell
        access={workspaceAccess}
        autoStartCheck={autoStartCheck}
        billingNavEnabled={billingNavEnabled}
        hasLiveChecks={liveChecks.length > 0}
      >
        <DashboardTierView checks={checks} stats={stats} tier={tier} />
      </DashboardWorkspaceShell>
    </main>
  );
}
