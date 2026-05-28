import Link from "next/link";
import { ArrowRight, FileSearch, Globe2, Shield, Sparkles, Scale } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { PricingPlanCta } from "@/components/pricing-plan-cta";
import { getCurrentUserContext, isAdminContext } from "@/lib/auth";
import { BILLING_PLANS, ENTERPRISE_CONTACT_PRODUCT, SCREENING_PAYMENT_PRODUCT } from "@/lib/billing";
import { buildBillingPath, isSubscriptionPlanIntent, parseBillingPlanIntent } from "@/lib/billing-navigation";
import { withLocalePath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Trusted Tenants. Safer Rentals.",
  description:
    "SafeKey is the trust layer for rental decisions in Greece, combining tenant checks, secure document collection, review workflows, and protection-ready screening outcomes.",
  openGraph: {
    description:
      "Launch tenant checks, collect documents through secure upload links, and review trusted screening and protection outcomes in one calm workflow.",
    title: "SafeKey | Trusted Tenants. Safer Rentals.",
  },
};

const productHighlights = [
  {
    icon: Shield,
    title: "Secure document collection",
    description:
      "Each case generates a private upload link so tenants can submit the requested documents without back-and-forth email chains.",
  },
  {
    icon: FileSearch,
    title: "Operational screening workflow",
    description:
      "Landlords can open a check, track submissions, review status changes, and move every applicant through one clear pipeline.",
  },
  {
    icon: Sparkles,
    title: "Decision-ready output",
    description:
      "SafeKey turns uploads into a risk score, recommendation, and document summary so rental decisions are faster and more consistent.",
  },
];

const landlordPainPoints = [
  {
    title: "Too much uncertainty before handing over the keys",
    description:
      "Landlords often decide on incomplete files, informal references, and scattered WhatsApp documents instead of a structured screening record.",
  },
  {
    title: "Expat tenants are harder to verify quickly",
    description:
      "Foreign applicants, remote employers, and cross-border income make traditional Greek rental checks slower and less consistent.",
  },
  {
    title: "Protection decisions come too late",
    description:
      "Deposit alternatives and rental protection are usually discussed after the lease is already emotionally committed, not when the risk profile is clearest.",
  },
] as const;

const greeceTrustSignals = [
  "Built for Greek rental workflows and document expectations",
  "Secure upload links with scoped access for each tenant case",
  "Structured approve / conditional / decline recommendations",
  "Protection-ready eligibility layer for partner distribution",
] as const;

const workflowSteps = [
  {
    step: "01",
    title: "Create a tenant check",
    description:
      "Enter the property, rent, tenant details, and the documents you want SafeKey to collect.",
  },
  {
    step: "02",
    title: "Send the secure upload link",
    description:
      "SafeKey generates a case-specific upload page for the tenant with the requested checklist already attached.",
  },
  {
    step: "03",
    title: "Track files and screening status",
    description:
      "As documents arrive, the dashboard updates with upload progress, case state, and review readiness.",
  },
  {
    step: "04",
    title: "Review the recommendation",
    description:
      "When the report is ready, landlords can review the score, recommendation, missing items, and key red flags.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const isGreek = locale === "el";
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

    redirect(withLocalePath(locale, "/dashboard"));
  }

  return (
    <main className="min-h-screen">
      <section className="page-shell flex flex-col gap-10 py-7 sm:gap-12 sm:py-8 lg:gap-16 lg:py-12">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <SafeKeyBrand priority variant="logo" />
            <div className="hidden rounded-full border border-[#cfb06a] bg-white px-4 py-2 text-sm font-semibold text-[#0f2343] shadow-[0_6px_16px_rgba(15,35,67,0.05)] md:inline-flex">
              Tenant Passport Greece
            </div>
            <LanguageSwitcher locale={locale} />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              className="secondary-action min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0"
              href="#pricing"
            >
              {isGreek ? "Τιμοκατάλογος" : "Pricing"}
            </Link>
            <Link
              className="primary-action cta-breathe min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0"
              href={withLocalePath(locale, "/login")}
            >
              {isGreek ? "Έναρξη ελέγχου" : "Start screening"}
            </Link>
          </div>
        </div>

        <section className="brand-hero grid gap-8 p-7 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-[1] space-y-7">
            <div className="inline-flex w-fit rounded-full border border-[#d8c490] bg-[#fffaf0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b6b17]">
              {isGreek ? "Αξιόπιστοι ενοικιαστές. Ασφαλέστερες μισθώσεις." : "Trusted Tenants. Safer Rentals."}
            </div>
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b6b17]">
                Tenant Passport Greece
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl xl:text-7xl">
                {isGreek ? "Γνώριζε ποιος παίρνει το κλειδί." : "Know Who Gets the Key."}
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-8 text-[#0f2343] sm:text-2xl">
                {isGreek
                  ? "Υποδομή ελέγχου ενοικιαστών και προστασίας μίσθωσης με AI, ειδικά για την ελληνική αγορά."
                  : "AI-powered tenant screening and rental protection infrastructure for the Greek rental market."}
              </p>
              <p className="max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
                SafeKey helps landlords and property teams open a case, collect documents through a secure
                tenant upload link, track screening progress, and review the final recommendation in one
                product.
              </p>
              <p className="max-w-2xl text-sm leading-7 text-[#42526b] sm:text-base">
                Tenant Passport Greece is the first SafeKey module and is purpose-built for Greek rental
                screening workflows.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Checks opened</p>
                <p className="mt-3 text-base font-semibold text-[#0f2343]">Launch a case in minutes</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Files tracked</p>
                <p className="mt-3 text-base font-semibold text-[#0f2343]">See submitted documents clearly</p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Decision output</p>
                <p className="mt-3 text-base font-semibold text-[#0f2343]">Risk score and recommendation</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                className="primary-action cta-breathe min-h-14 w-full gap-2 sm:w-auto"
                href={withLocalePath(locale, "/login")}
              >
                {isGreek ? "Δημιούργησε τον πρώτο έλεγχο ενοικιαστή" : "Create your first tenant check"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="secondary-action min-h-14 w-full gap-2 sm:w-auto"
                href="#how-it-works"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative z-[1]">
            <div className="card space-y-6 bg-white">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Product overview</p>
                <h2 className="text-2xl font-semibold text-slate-950">A clear workflow for each rental decision</h2>
              </div>

              <div className="space-y-3">
                {[
                  "Create the check and choose requested documents",
                  "Share the secure upload page with the tenant",
                  "Track uploaded files and screening status",
                  "Review the score, recommendation, and report summary",
                ].map((item) => (
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#42526b]">Status</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">Live case tracking</p>
                </div>
                <div className="rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#42526b]">Documents</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">Requested vs received</p>
                </div>
                <div className="rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#42526b]">Outcome</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">Score + recommendation</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-panel space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="section-kicker">Why landlords choose SafeKey</p>
            <h2 className="section-title">Rental decisions need trust, not more inbox chaos.</h2>
            <p className="text-base leading-8 text-slate-700">
              SafeKey gives property owners and operators one calm workflow to verify applicants, document the
              decision, and move into protection-ready outcomes with operational credibility.
            </p>
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
              Expat and local rental market
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Screening infrastructure for Greece&apos;s mixed local and expat tenant market.
            </h2>
            <p className="text-base leading-8 text-slate-700">
              Whether the applicant is a Greek salaried tenant or an EU professional relocating to Athens, Chania,
              or Thessaloniki, SafeKey standardizes the evidence pack and review path before the lease is signed.
            </p>
          </div>

          <div className="relative z-[1] grid gap-3">
            {greeceTrustSignals.map((signal) => (
              <div
                className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4"
                key={signal}
              >
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-[#183454]" />
                <p className="text-sm font-medium leading-7 text-slate-800">{signal}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Product explanation</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              SafeKey is a tenant verification workflow, not a document inbox.
            </h2>
            <p className="text-base leading-8 text-slate-700">
              Landlords and property teams can open a case, request the right information, monitor progress,
              and review the final outcome in one place instead of stitching the process together manually.
            </p>
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">How it works</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              A clean four-step screening flow for every tenant case.
            </h2>
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

        <section className="space-y-5" id="pricing">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Pricing</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Straightforward plans for individual landlords and property teams.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {BILLING_PLANS.map((plan) => (
              <div
                className={`card space-y-6 ${plan.featured ? "border-[#cfb06a] shadow-[0_22px_48px_rgba(15,35,67,0.11)]" : ""}`}
                key={plan.key}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-slate-950">{plan.name}</h3>
                    {plan.featured ? (
                      <span className="rounded-full border border-[#d8c490] bg-[#fffaf0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b6b17]">
                        Most popular
                      </span>
                    ) : null}
                  </div>
                  <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">{plan.shortPrice}</p>
                  <p className="text-sm leading-7 text-slate-700">{plan.description}</p>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div className="flex items-start gap-3 text-sm font-medium text-slate-800" key={feature}>
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#0f2343]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <PricingPlanCta
                  className={`inline-flex min-h-12 w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? "primary-action cta-breathe"
                      : "secondary-action rounded-[18px] border-slate-300 px-5 py-3"
                  }`}
                  plan={plan.key}
                >
                  Choose {plan.name}
                </PricingPlanCta>
              </div>
            ))}

            <div className="card space-y-6 lg:col-span-1">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-950">{SCREENING_PAYMENT_PRODUCT.name}</h3>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">Pay per case</p>
                <p className="text-sm leading-7 text-slate-700">{SCREENING_PAYMENT_PRODUCT.description}</p>
              </div>
              <PricingPlanCta
                className="secondary-action inline-flex min-h-12 w-full items-center justify-center rounded-[18px] border-slate-300 px-5 py-3 text-sm font-semibold"
                plan="screening"
              >
                Choose single screening
              </PricingPlanCta>
            </div>

            <div className="card space-y-6 lg:col-span-1">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-950">{ENTERPRISE_CONTACT_PRODUCT.name}</h3>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">Custom</p>
                <p className="text-sm leading-7 text-slate-700">{ENTERPRISE_CONTACT_PRODUCT.description}</p>
              </div>
              <div className="space-y-3">
                {ENTERPRISE_CONTACT_PRODUCT.features.map((feature) => (
                  <div className="flex items-start gap-3 text-sm font-medium text-slate-800" key={feature}>
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#0f2343]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                className="secondary-action inline-flex min-h-12 w-full items-center justify-center rounded-[18px] border-slate-300 px-5 py-3 text-sm font-semibold"
                href="#support"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>

        <section className="brand-hero grid gap-6 p-7 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-[1] space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Ready to start</p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Open your first SafeKey case and run the full tenant screening flow.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-slate-700">
              Create the case, share the upload page, track the documents, and review the recommendation inside
              the dashboard.
            </p>
          </div>

          <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              className="primary-action cta-breathe min-h-14 gap-2"
                href={withLocalePath(locale, "/login")}
            >
              {isGreek ? "Ξεκίνα με το SafeKey" : "Start with SafeKey"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="secondary-action min-h-14"
              href={withLocalePath(locale, "/login")}
            >
              {isGreek ? "Σύνδεση" : "Sign in"}
            </Link>
          </div>
        </section>

        <PublicSiteFooter />
      </section>
    </main>
  );
}
