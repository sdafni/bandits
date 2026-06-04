import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomePageContent } from "@/components/home-page-content";
import { getCurrentUserContext, isAdminContext } from "@/lib/auth";
import { resolveSiteAuthState } from "@/lib/site-auth-state";
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
  title: "Know Who Gets the Key | SafeKey",
  description:
    "Tenant verification and rental trust reports for landlords in Greece. Start a check, collect documents, get a clear recommendation.",
  openGraph: {
    description:
      "Tenant verification and rental trust reports for landlords in Greece.",
    title: "SafeKey | Know Who Gets the Key",
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
  }

  const auth = await resolveSiteAuthState();

  return <HomePageContent auth={auth} />;
}
