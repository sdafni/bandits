"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, FileUp, Sparkles } from "lucide-react";
import { PublicSiteFooterContent } from "@/components/public-site-footer-content";
import { LandingProductPreview } from "@/components/landing-product-preview";
import { LandingSampleReport } from "@/components/landing-sample-report";
import { LandingSiteHeader } from "@/components/landing-site-header";
import { BILLING_PLANS, SCREENING_PAYMENT_PRODUCT } from "@/lib/billing";
import { getLocalizedPlanName } from "@/lib/billing-i18n";
import { buildLoginHref, buildPrimaryConversionHref } from "@/lib/billing-navigation";
import { useLocale } from "@/lib/i18n/context";
import { localizeHref, withLocalePath } from "@/lib/i18n";
import type { SiteAuthState } from "@/lib/site-auth-state";

const planFeatureKeys: Record<string, string[]> = {
  basic: ["plans.basic.f1", "plans.basic.f2", "plans.basic.f3", "plans.basic.f4", "plans.basic.f5"],
  pro: ["plans.pro.f1", "plans.pro.f2", "plans.pro.f3", "plans.pro.f4", "plans.pro.f5"],
  premium: ["plans.premium.f1", "plans.premium.f2", "plans.premium.f3", "plans.premium.f4", "plans.premium.f5"],
};

const planChooseKeys: Record<string, "pricing.chooseBasic" | "pricing.choosePro" | "pricing.choosePremium"> = {
  basic: "pricing.chooseBasic",
  pro: "pricing.choosePro",
  premium: "pricing.choosePremium",
};

export function HomePageContent({ auth }: { auth: SiteAuthState }) {
  const { locale, t } = useLocale();
  const signInPath = withLocalePath(locale, "/login#auth");
  const startCheckPath = buildPrimaryConversionHref(locale, auth);

  const workflowSteps = [
    { icon: ClipboardList, title: t("workflow.step1Title"), description: t("workflow.step1Body") },
    { icon: FileUp, title: t("workflow.step2Title"), description: t("workflow.step2Body") },
    { icon: Sparkles, title: t("workflow.step3Title"), description: t("workflow.step3Body") },
  ];

  const trustSignals = [
    t("landing.trust.gdpr"),
    t("landing.trust.secureCollection"),
    t("landing.trust.privateLinks"),
    t("landing.trust.localTenants"),
    t("landing.trust.scoring"),
    t("landing.trust.insurance"),
  ];

  const planDescriptions: Record<string, string> = {
    basic: t("pricing.basicDesc"),
    pro: t("pricing.proDesc"),
    premium: t("pricing.premiumDesc"),
  };

  return (
    <main className="min-h-screen">
      <LandingSiteHeader auth={auth} />

      <div className="page-shell flex flex-col gap-10 py-6 sm:gap-12 sm:py-8 lg:gap-14">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10" data-testid="home-hero">
          <div className="space-y-5 sm:space-y-6">
            <h1
              className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl xl:text-[3.25rem] xl:leading-[1.05]"
              data-testid="home-hero-title"
            >
              {t("hero.title")}
            </h1>
            <p className="max-w-xl text-lg font-medium leading-8 text-[#0f2343] sm:text-xl">{t("hero.subtitle")}</p>
            <ul className="max-w-xl space-y-2 text-base leading-7 text-slate-700">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b6b17]" aria-hidden />
                {t("hero.support1")}
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b6b17]" aria-hidden />
                {t("hero.support2")}
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b6b17]" aria-hidden />
                {t("hero.support3")}
              </li>
            </ul>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <Link className="primary-action cta-breathe min-h-12 w-full gap-2 sm:w-auto" href={startCheckPath}>
                {t("hero.ctaPrimary")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="secondary-action min-h-12 w-full sm:w-auto"
                href={withLocalePath(locale, "/sample-report")}
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <LandingProductPreview />
          </div>
        </section>

        <div className="lg:hidden">
          <LandingProductPreview />
        </div>

        <section className="scroll-mt-24 space-y-5" data-testid="home-pricing" id="pricing">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("pricing.kicker")}</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{t("pricing.title")}</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
            {BILLING_PLANS.map((plan) => (
              <div
                className={`card space-y-5 ${plan.featured ? "border-[#cfb06a] shadow-[0_22px_48px_rgba(15,35,67,0.11)]" : ""}`}
                key={plan.key}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-slate-950">{getLocalizedPlanName(locale, plan.key)}</h3>
                    {plan.featured ? (
                      <span className="rounded-full border border-[#d8c490] bg-[#fffaf0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b6b17]">
                        {t("pricing.mostPopular")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">
                    {plan.shortPrice}
                    <span className="ml-1 text-sm font-medium text-slate-500">{t("pricing.perMonth")}</span>
                  </p>
                  <p className="text-sm leading-7 text-slate-700">{planDescriptions[plan.key]}</p>
                </div>
                <div className="space-y-2.5">
                  {(planFeatureKeys[plan.key] ?? []).map((featureKey) => (
                    <div className="flex items-start gap-3 text-sm font-medium text-slate-800" key={featureKey}>
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0f2343]" />
                      <span>{t(featureKey)}</span>
                    </div>
                  ))}
                </div>
                <Link
                  className={`inline-flex min-h-12 w-full items-center justify-center rounded-[16px] px-5 py-3 text-sm font-semibold transition ${
                    plan.featured ? "primary-action cta-breathe" : "secondary-action border-slate-300"
                  }`}
                  href={localizeHref(locale, buildLoginHref(plan.key))}
                >
                  {t(planChooseKeys[plan.key])}
                </Link>
              </div>
            ))}

            <div className="card space-y-5">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-950">{t("billing.screening.name")}</h3>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">
                  {SCREENING_PAYMENT_PRODUCT.shortPrice}
                  <span className="ml-1 text-sm font-medium text-slate-500">{t("pricing.perCheck")}</span>
                </p>
                <p className="text-sm leading-7 text-slate-700">{t("pricing.screeningDesc")}</p>
              </div>
              <Link
                className="secondary-action inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border-slate-300 px-5 py-3 text-sm font-semibold"
                href={localizeHref(locale, buildLoginHref("screening"))}
              >
                {t("pricing.chooseScreening")}
              </Link>
            </div>

            <div className="card space-y-5">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-950">{t("billing.enterprise.name")}</h3>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">{t("pricing.custom")}</p>
                <p className="text-sm leading-7 text-slate-700">{t("pricing.enterpriseDesc")}</p>
              </div>
              <Link
                className="secondary-action inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border-slate-300 px-5 py-3 text-sm font-semibold"
                href="#support"
              >
                {t("pricing.contactUs")}
              </Link>
            </div>
          </div>
        </section>

        <LandingSampleReport auth={auth} />

        <section className="space-y-6" id="how-it-works">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{t("workflow.title")}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm" key={step.title}>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8f1d8] text-[#8b6b17]">
                  <step.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b6b17]">
                  {t("landing.stepLabel").replace("{step}", String(index + 1))}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{t("landing.trust.title")}</h2>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trustSignals.map((signal) => (
              <li className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-800" key={signal}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0f2343]" aria-hidden />
                {signal}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[28px] border border-[#d8c490]/50 bg-gradient-to-br from-[#fffaf0] to-white p-7 text-center sm:p-10">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{t("cta.title")}</h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link className="primary-action cta-breathe min-h-12 w-full min-w-[220px] gap-2 sm:w-auto" href={startCheckPath}>
              {t("cta.primary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="secondary-action min-h-12 w-full min-w-[160px] sm:w-auto" href={signInPath}>
              {t("cta.secondary")}
            </Link>
          </div>
        </section>

        <PublicSiteFooterContent />
      </div>
    </main>
  );
}
