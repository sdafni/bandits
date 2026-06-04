import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthPanels } from "@/components/auth-panels";
import { LoginPageMarketing } from "@/components/login-page-marketing";
import { LandingSiteHeader } from "@/components/landing-site-header";
import { PublicSiteFooterContent } from "@/components/public-site-footer-content";
import { getCurrentUserContext, isAdminContext } from "@/lib/auth";
import { resolveSiteAuthState } from "@/lib/site-auth-state";
import { buildBillingPath, isSubscriptionPlanIntent, parseBillingPlanIntent } from "@/lib/billing-navigation";
import { withLocalePath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { sanitizeInternalPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Access SafeKey to launch tenant checks, collect documents securely, and review screening and protection workflows for the Greek rental market.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string; reason?: string }>;
}) {
  const locale = await getRequestLocale();
  const params = await searchParams;
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

    redirect(withLocalePath(locale, sanitizeInternalPath(params.next, "/dashboard")));
  }

  const auth = await resolveSiteAuthState();

  return (
    <main className="min-h-screen">
      <LandingSiteHeader auth={auth} />
      <div className="page-shell flex flex-col gap-8 py-6 sm:gap-10 sm:py-10">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.9fr)] lg:items-start lg:gap-14 xl:gap-20">
          <LoginPageMarketing />
          <div className="scroll-mt-28 lg:justify-self-end lg:w-full lg:max-w-[640px]" id="auth">
            <Suspense fallback={<div className="card auth-card h-[420px] animate-pulse rounded-[32px] bg-slate-100" />}>
              <AuthPanels />
            </Suspense>
          </div>
        </section>

        <PublicSiteFooterContent showTrustLayer={false} />
      </div>
    </main>
  );
}
