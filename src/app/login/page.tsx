import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthPanels } from "@/components/auth-panels";
import { LoginPageMarketing } from "@/components/login-page-marketing";
import { PublicSiteFooterContent } from "@/components/public-site-footer-content";
import { getCurrentUserContext, isAdminContext } from "@/lib/auth";
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

    redirect(withLocalePath(locale, sanitizeInternalPath(params.next)));
  }

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-[1500px]">
        <section className="flex min-h-[calc(100vh-2rem)] items-center sm:min-h-[calc(100vh-3.5rem)]">
          <div className="grid w-full gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(560px,0.86fr)] xl:items-center xl:gap-20 2xl:gap-24">
            <LoginPageMarketing />
            <div className="xl:justify-self-end xl:w-full xl:max-w-[700px] 2xl:max-w-[740px]">
              <Suspense fallback={<div className="card auth-card h-[420px] animate-pulse rounded-[32px] bg-slate-100" />}>
                <AuthPanels />
              </Suspense>
            </div>
          </div>
        </section>

        <PublicSiteFooterContent showTrustLayer={false} />
      </div>
    </main>
  );
}
