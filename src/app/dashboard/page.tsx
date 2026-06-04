import type { Metadata } from "next";
import { DashboardTierView } from "@/components/dashboard/dashboard-tier-view";
import { DashboardWorkspaceShell } from "@/components/dashboard-workspace-shell";
import { mergeLandlordChecksWithDemo } from "@/lib/demo-data";
import { buildDashboardStats } from "@/lib/dashboard-stats";
import { resolveDashboardTier } from "@/lib/dashboard-tier";
import { resolveMonetizationAccessForLandlord } from "@/lib/billing-entitlements";
import type { MonetizationPermissionsSnapshot } from "@/lib/monetization";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { applyAdminWorkspaceOverrides, isAdminProfile } from "@/lib/admin-access";
import { requireLandlord } from "@/lib/auth";
import { getLandlordChecks } from "@/lib/queries";
import { getSafeBillingOverviewForUser } from "@/lib/safe-billing-overview";
import { resolveWorkspaceAccess } from "@/lib/workspace-access";

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
  } catch (error) {
    console.error("[dashboard] getLandlordChecks failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    liveChecks = [];
  }

  const checks = mergeLandlordChecksWithDemo(liveChecks);
  const billingOverview = await getSafeBillingOverviewForUser(profile.id);
  const monetizationAccess = await resolveMonetizationAccessForLandlord(profile.id);
  let workspaceAccess = resolveWorkspaceAccess(billingOverview, {
    config: monetizationAccess.config,
    entitlements: monetizationAccess.entitlements,
  });
  if (isAdminProfile(profile)) {
    workspaceAccess = applyAdminWorkspaceOverrides(workspaceAccess);
  }
  const tier = resolveDashboardTier(workspaceAccess);
  const stats = buildDashboardStats(checks, workspaceAccess.limits);

  return (
    <main className="min-h-screen bg-slate-100/80">
      <DashboardWorkspaceShell
        access={workspaceAccess}
        autoStartCheck={autoStartCheck}
        monetizationPermissions={monetizationAccess.permissions}
        hasLiveChecks={liveChecks.length > 0}
      >
        <DashboardTierView checks={checks} stats={stats} tier={tier} />
      </DashboardWorkspaceShell>
    </main>
  );
}
