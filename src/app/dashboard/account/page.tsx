import type { Metadata } from "next";
import { AccountPageSections } from "@/components/dashboard/account-page-sections";
import { AccountSignOutButton } from "@/components/dashboard/account-sign-out-button";
import { DashboardLandlordHeader } from "@/components/dashboard/dashboard-landlord-header";
import { requireLandlord } from "@/lib/auth";
import { resolveBillingNavEnabled } from "@/lib/billing-nav";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { getSafeBillingOverviewForUser } from "@/lib/safe-billing-overview";
import { resolveWorkspaceAccess } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: translate(locale, "account.pageTitle"),
    description: translate(locale, "account.pageDescription"),
  };
}

export default async function DashboardAccountPage() {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(locale, key);
  const { profile, user } = await requireLandlord();
  const billingOverview = await getSafeBillingOverviewForUser(profile.id);
  const billingNavEnabled = await resolveBillingNavEnabled(profile.id);
  const access = resolveWorkspaceAccess(billingOverview);

  const planStatusLabel = access.hasActiveSubscription
    ? t("account.planActive")
    : access.screeningCredits > 0
      ? t("account.planPayPerCheck")
      : t("account.planNone");

  return (
    <main className="min-h-screen bg-slate-100/80">
      <DashboardLandlordHeader activeNav="account" />
      <div className="dashboard-landlord-page space-y-5">
        <AccountPageSections
          billingNavEnabled={billingNavEnabled}
          email={user.email ?? profile.email}
          fullName={profile.full_name}
          planStatusLabel={planStatusLabel}
        />
        <section className="rounded-2xl border border-slate-200/90 bg-white px-5 py-5 shadow-sm sm:px-6">
          <AccountSignOutButton />
        </section>
      </div>
    </main>
  );
}
