import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomePageContent } from "@/components/home-page-content";
import { getCurrentUserContext, isAdminContext } from "@/lib/auth";
import {
  buildBillingPath,
  buildDashboardStartCheckPath,
  isSubscriptionPlanIntent,
  parseBillingPlanIntent,
} from "@/lib/billing-navigation";
import { withLocalePath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Trusted Tenants. Safer Rentals.",
  description:
    "Simple tenant checks for landlords in Greece — start a check, collect documents, get a recommendation.",
  openGraph: {
    description:
      "Start a tenant check, send a secure upload link, and get a clear rental recommendation.",
    title: "SafeKey | Trusted Tenants. Safer Rentals.",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; start?: string }>;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const planIntent = parseBillingPlanIntent(params.plan);
  const { user, profile } = await getCurrentUserContext();

  if (user && profile) {
    if (isAdminContext(profile.email, profile.role)) {
      redirect(withLocalePath(locale, "/admin/review"));
    }

    if (planIntent) {
      if (isSubscriptionPlanIntent(planIntent)) {
        redirect(`/dashboard/billing/start?plan=${planIntent}`);
      }

      redirect(buildBillingPath("screening"));
    }

    if (params.start === "check") {
      redirect(buildDashboardStartCheckPath(locale));
    }

    redirect(withLocalePath(locale, "/dashboard"));
  }

  return <HomePageContent />;
}
