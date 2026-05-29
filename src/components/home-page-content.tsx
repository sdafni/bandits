"use client";

import Link from "next/link";
import { ArrowRight, FileSearch, Globe2, Scale, Shield, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PublicSiteFooterContent } from "@/components/public-site-footer-content";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { BILLING_PLANS } from "@/lib/billing";
import { getLocalizedPlanName } from "@/lib/billing-i18n";
import { buildLoginHref, buildStartCheckLoginHref } from "@/lib/billing-navigation";
import { useLocale } from "@/lib/i18n/context";
import { localizeHref, withLocalePath } from "@/lib/i18n";

const planFeatureKeys: Record<string, string[]> = {
  basic: ["plans.basic.f1", "plans.basic.f2", "plans.basic.f3", "plans.basic.f4", "plans.basic.f5"],
  pro: ["plans.pro.f1", "plans.pro.f2", "plans.pro.f3", "plans.pro.f4", "plans.pro.f5"],
  premium: ["plans.premium.f1", "plans.premium.f2", "plans.premium.f3", "plans.premium.f4", "plans.premium.f5"],
};

export function HomePageContent() {
  const { locale, t } = useLocale();
  const startCheckPath = buildStartCheckLoginHref(locale);
  const signInPath = withLocalePath(locale, "/login");

  const productHighlights = [
    { icon: Shield, title: t("product.feature1Title"), description: t("product.feature1Body") },
    { icon: FileSearch, title: t("product.feature2Title"), description: t("product.feature2Body") },
    { icon: Sparkles, title: t("product.feature3Title"), description: t("product.feature3Body") },
  ];

  const landlordPainPoints = [
    { title: t("why.pain1Title"), description: t("why.pain1Body") },
    { title: t("why.pain2Title"), description: t("why.pain2Body") },
    { title: t("why.pain3Title"), description: t("why.pain3Body") },
  ];

  const greeceTrustSignals = [t("market.signal1"), t("market.signal2"), t("market.signal3"), t("market.signal4")];

  const workflowSteps = [
    { step: "01", title: t("workflow.step1Title"), description: t("workflow.step1Body") },
    { step: "02", title: t("workflow.step2Title"), description: t("workflow.step2Body") },
    { step: "03", title: t("workflow.step3Title"), description: t("workflow.step3Body") },
  ].filter((item) => item.title.trim().length > 0);

  const overviewSteps = [t("overview.step1"), t("overview.step2"), t("overview.step3")].filter(
    (step) => step.trim().length > 0,
  );

  const planDescriptions: Record<string, string> = {
    basic: t("pricing.basicDesc"),
    pro: t("pricing.proDesc"),
    premium: t("pricing.premiumDesc"),
  };

  return (
    <main className="min-h-screen">
      <section className="page-shell flex flex-col gap-10 py-7 sm:gap-12 sm:py-8 lg:gap-16 lg:py-12">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <SafeKeyBrand priority variant="logo" />
            <div className="hidden rounded-full border border-[#cfb06a] bg-white px-4 py-2 text-sm font-semibold text-[#0f2343] shadow-[0_6px_16px_rgba(15,35,67,0.05)] md:inline-flex">
              {t("nav.tenantPassport")}
            </div>
            <LanguageSwitcher />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link className="secondary-action min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0" href="#pricing">
              {t("nav.pricing")}
            </Link>
            <Link className="primary-action cta-breathe min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0" href={startCheckPath}>
              {t("nav.startScreening")}
            </Link>
          </div>
        </div>

        <section className="brand-hero grid gap-8 p-7 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center" data-testid="home-hero">
          <div className="relative z-[1] space-y-7">
            <div className="inline-flex w-fit rounded-full border border-[#d8c490] bg-[#fffaf0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b6b17]">
              {t("hero.kicker")}
            </div>
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b6b17]">{t("nav.tenantPassport")}</p>
              <h1
                className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl xl:text-7xl"
                data-testid="home-hero-title"
              >
                {t("hero.title")}
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-8 text-[#0f2343] sm:text-2xl">{t("hero.subtitle")}</p>
              <p className="max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">{t("hero.body")}</p>
              <p className="max-w-2xl text-sm leading-7 text-[#42526b] sm:text-base">{t("hero.moduleNote")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">{t("hero.metricChecks")}</p>
                <p className="mt-3 text-base font-semibold text-[#0f2343]">{t("hero.metricChecksValue")}</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">{t("hero.metricFiles")}</p>
                <p className="mt-3 text-base font-semibold text-[#0f2343]">{t("hero.metricFilesValue")}</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">{t("hero.metricOutcome")}</p>
                <p className="mt-3 text-base font-semibold text-[#0f2343]">{t("hero.metricOutcomeValue")}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link className="primary-action cta-breathe min-h-14 w-full gap-2 sm:w-auto" href={startCheckPath}>
                {t("hero.ctaPrimary")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="secondary-action min-h-14 w-full gap-2 sm:w-auto" href="#how-it-works">
                {t("hero.ctaSecondary")}
              </Link>
            </div>
          </div>

          <div className="relative z-[1]">
            <div className="card space-y-6 bg-white">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("overview.kicker")}</p>
                <h2 className="text-2xl font-semibold text-slate-950">{t("overview.title")}</h2>
              </div>
              <div className="space-y-3">
                {overviewSteps.map((item) => (
                  <div
                    className="flex items-start gap-3 rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-4"
                    key={item}
                  >
                    <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#8b6b17]" />
                    <p className="text-sm font-medium leading-7 text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#42526b]">{t("overview.status")}</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">{t("overview.statusValue")}</p>
                </div>
                <div className="rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#42526b]">{t("overview.documents")}</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">{t("overview.documentsValue")}</p>
                </div>
                <div className="rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#42526b]">{t("overview.outcome")}</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">{t("overview.outcomeValue")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-panel space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="section-kicker">{t("why.kicker")}</p>
            <h2 className="section-title">{t("why.title")}</h2>
            <p className="text-base leading-8 text-slate-700">{t("why.body")}</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {landlordPainPoints.map((item) => (
              <article className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-6" key={item.title}>
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="brand-hero grid gap-8 p-7 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="relative z-[1] space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8c490] bg-[#fffaf0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">
              <Globe2 className="h-3.5 w-3.5" />
              {t("market.kicker")}
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{t("market.title")}</h2>
            <p className="text-base leading-8 text-slate-700">{t("market.body")}</p>
          </div>
          <div className="relative z-[1] grid gap-3">
            {greeceTrustSignals.map((signal) => (
              <div className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4" key={signal}>
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-[#183454]" />
                <p className="text-sm font-medium leading-7 text-slate-800">{signal}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("product.kicker")}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{t("product.title")}</h2>
            <p className="text-base leading-8 text-slate-700">{t("product.body")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {productHighlights.map((item) => (
              <div className="card space-y-4" key={item.title}>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8f1d8] text-[#8b6b17]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="text-sm leading-7 text-slate-700">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5" id="how-it-works">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("workflow.kicker")}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{t("workflow.title")}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step) => (
              <div className="card space-y-5" key={step.step}>
                <div className="inline-flex rounded-full border border-[#d8c490] bg-[#fffaf0] px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[#8b6b17]">
                  {step.step}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-950">{step.title}</h3>
                  <p className="text-sm leading-7 text-slate-700">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5 scroll-mt-24" data-testid="home-pricing" id="pricing">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("pricing.kicker")}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{t("pricing.title")}</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {BILLING_PLANS.map((plan) => (
              <div
                className={`card space-y-6 ${plan.featured ? "border-[#cfb06a] shadow-[0_22px_48px_rgba(15,35,67,0.11)]" : ""}`}
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
                <div className="space-y-3">
                  {(planFeatureKeys[plan.key] ?? []).map((featureKey) => (
                    <div className="flex items-start gap-3 text-sm font-medium text-slate-800" key={featureKey}>
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#0f2343]" />
                      <span>{t(featureKey)}</span>
                    </div>
                  ))}
                </div>
                <Link
                  className={`inline-flex min-h-12 w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? "primary-action cta-breathe"
                      : "secondary-action rounded-[18px] border-slate-300 px-5 py-3"
                  }`}
                  href={localizeHref(locale, buildLoginHref(plan.key))}
                >
                  {t("pricing.choosePlan")} {getLocalizedPlanName(locale, plan.key)}
                </Link>
              </div>
            ))}

            <div className="card space-y-6 lg:col-span-1">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-950">{t("billing.screening.name")}</h3>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">{t("pricing.payPerCase")}</p>
                <p className="text-sm leading-7 text-slate-700">{t("pricing.screeningDesc")}</p>
              </div>
              <Link
                className="secondary-action inline-flex min-h-12 w-full items-center justify-center rounded-[18px] border-slate-300 px-5 py-3 text-sm font-semibold"
                href={localizeHref(locale, buildLoginHref("screening"))}
              >
                {t("pricing.chooseScreening")}
              </Link>
            </div>

            <div className="card space-y-6 lg:col-span-1">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-950">{t("billing.enterprise.name")}</h3>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">{t("pricing.custom")}</p>
                <p className="text-sm leading-7 text-slate-700">{t("pricing.enterpriseDesc")}</p>
              </div>
              <Link
                className="secondary-action inline-flex min-h-12 w-full items-center justify-center rounded-[18px] border-slate-300 px-5 py-3 text-sm font-semibold"
                href="#support"
              >
                {t("pricing.contactUs")}
              </Link>
            </div>
          </div>
        </section>

        <section className="brand-hero grid gap-6 p-7 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-[1] space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("cta.kicker")}</p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{t("cta.title")}</h2>
            <p className="max-w-2xl text-base leading-8 text-slate-700">{t("cta.body")}</p>
          </div>
          <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link className="primary-action cta-breathe min-h-14 gap-2" href={startCheckPath}>
              {t("cta.primary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="secondary-action min-h-14" href={signInPath}>
              {t("cta.secondary")}
            </Link>
          </div>
        </section>

        <PublicSiteFooterContent />
      </section>
    </main>
  );
}
