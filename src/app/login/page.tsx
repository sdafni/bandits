import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthPanels } from "@/components/auth-panels";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PlatformPreview } from "@/components/platform-preview";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { SafeKeyBrand } from "@/components/safekey-brand";
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
  const isGreek = locale === "el";
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
            <div className="space-y-7 xl:max-w-[38rem]">
              <div className="space-y-4">
                <div className="inline-flex rounded-[30px] bg-white px-4 py-4 sm:rounded-[36px] sm:px-6 sm:py-5">
                  <SafeKeyBrand href="/" priority variant="logo" />
                </div>
                <LanguageSwitcher locale={locale} />

                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5a6980] sm:text-sm">
                  {isGreek ? "Αξιόπιστοι ενοικιαστές. Ασφαλέστερες μισθώσεις." : "Trusted Tenants. Safer Rentals."}
                </p>
              </div>

              <div className="space-y-4 sm:space-y-5">
                <h1 className="text-pretty text-[3rem] font-semibold leading-[0.92] tracking-[-0.08em] text-slate-950 sm:text-[4.5rem] xl:text-[6.4rem]">
                  {isGreek ? "Γνώριζε ποιος παίρνει το κλειδί." : "Know Who Gets the Key."}
                </h1>
                <p className="max-w-[30rem] text-pretty text-[1rem] font-medium leading-7 text-[#0f2343] sm:text-[1.35rem] sm:leading-8">
                  {isGreek
                    ? "Υποδομή ελέγχου ενοικιαστών και προστασίας μίσθωσης με AI για την ελληνική αγορά."
                    : "AI-powered tenant screening and rental protection infrastructure for the Greek rental market."}
                </p>
                <p className="max-w-[27rem] text-[15px] leading-7 text-slate-600 sm:text-[1rem]">
                  {isGreek
                    ? "Ήρεμος χώρος εργασίας για ασφαλή συλλογή εγγράφων, αξιολόγηση και τελικές αποφάσεις μίσθωσης."
                    : "A calm workspace for secure document collection, review, protection eligibility, and final rental decisions."}
                </p>
              </div>
            </div>

            <div className="xl:justify-self-end xl:w-full xl:max-w-[700px] 2xl:max-w-[740px]">
              <Suspense fallback={<div className="card auth-card h-[420px] animate-pulse rounded-[32px] bg-slate-100" />}>
                <AuthPanels />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="space-y-5 border-t border-[#e8edf4] pt-10 sm:pt-12">
          <div className="max-w-[36rem] space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Operational layer</p>
            <h2 className="text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.15rem]">
              {isGreek ? "Πίσω από την απόφαση λειτουργεί ένα αξιόπιστο σύστημα." : "A quieter system sits behind the screening decision."}
            </h2>
          </div>

          <PlatformPreview />
        </section>

        <PublicSiteFooter showTrustLayer={false} />
      </div>
    </main>
  );
}
