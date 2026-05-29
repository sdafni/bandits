import type { Metadata } from "next";
import Link from "next/link";
import { DashboardLandlordHeader } from "@/components/dashboard/dashboard-landlord-header";
import { SignOutForm } from "@/components/sign-out-form";
import { requireLandlord } from "@/lib/auth";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { withLocalePath } from "@/lib/i18n";
import { resolveBillingNavEnabled } from "@/lib/billing-nav";
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

  return (
    <main className="min-h-screen bg-slate-100/80">
      <DashboardLandlordHeader activeNav="account" />
      <div className="dashboard-landlord-page space-y-5">
        <section className="rounded-2xl border border-slate-200/90 bg-white px-5 py-6 shadow-sm sm:px-6">
          <h2 className="text-lg font-semibold text-slate-950">{t("account.title")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("account.subtitle")}</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-slate-500">{t("account.emailLabel")}</dt>
              <dd className="mt-1 font-medium text-slate-900">{user.email ?? profile.email}</dd>
            </div>
            {profile.full_name ? (
              <div>
                <dt className="font-medium text-slate-500">{t("account.nameLabel")}</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.full_name}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-slate-500">{t("account.planLabel")}</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {access.hasActiveSubscription
                  ? t("account.planActive")
                  : access.screeningCredits > 0
                    ? t("account.planPayPerCheck")
                    : t("account.planNone")}
              </dd>
            </div>
          </dl>
          {billingNavEnabled && !access.hasActiveSubscription && access.screeningCredits === 0 ? (
            <Link
              className="workspace-cta mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold sm:w-auto"
              href={withLocalePath(locale, "/dashboard/billing")}
            >
              {t("dashboard.planOnboarding.choosePlan")}
            </Link>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200/90 bg-white px-5 py-5 shadow-sm sm:px-6">
          <SignOutForm />
        </section>
      </div>
    </main>
  );
}
