import Link from "next/link";
import { ArrowRight, FileSearch, Shield, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { getCurrentUserContext, isAdminContext } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Trusted Tenants. Safer Rentals.",
  description:
    "SafeKey is the trust layer for rental decisions in Greece. Launch tenant checks, collect documents through secure upload links, and review a clear recommendation inside one product.",
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

const pricingPlans = [
  {
    name: "Basic",
    price: "€19",
    description: "For individual landlords running occasional screening checks.",
    features: [
      "1 active tenant check at a time",
      "Secure document upload link",
      "Document status tracking",
      "Final recommendation view",
    ],
  },
  {
    name: "Pro",
    price: "€49",
    description: "For active landlords and agents who need a steady screening workflow.",
    featured: true,
    features: [
      "Up to 10 active tenant checks",
      "Dashboard risk score overview",
      "Faster case turnaround",
      "Priority product support",
    ],
  },
  {
    name: "Premium",
    price: "€149",
    description: "For property managers and teams running screening as an operational process.",
    features: [
      "Unlimited active tenant checks",
      "Team-style operational workflow",
      "Priority review queue",
      "Premium support and onboarding",
    ],
  },
];

export default async function HomePage() {
  const { user, profile } = await getCurrentUserContext();

  if (user && profile) {
    redirect(isAdminContext(profile.email, profile.role) ? "/admin/review" : "/dashboard");
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-8 lg:gap-16 lg:py-12">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <SafeKeyBrand priority variant="logo" />
            <div className="hidden rounded-full border border-[#d8c490] bg-white/85 px-4 py-2 text-sm font-medium text-[#0f2343] md:inline-flex">
              Tenant Passport Greece
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-[#d8c490] px-5 py-3 text-sm font-medium text-[#0f2343] transition hover:bg-white sm:min-h-0"
              href="#pricing"
            >
              Pricing
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-[18px] bg-[#0f2343] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,35,67,0.16)] transition hover:bg-[#0b1931] sm:min-h-0"
              href="/login"
            >
              Start screening
            </Link>
          </div>
        </div>

        <section className="brand-hero grid gap-8 p-7 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-[1] space-y-7">
            <div className="inline-flex w-fit rounded-full border border-[#d8c490] bg-[#fffaf0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b6b17]">
              Trusted Tenants. Safer Rentals.
            </div>
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b6b17]">
                Tenant Passport Greece
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl xl:text-7xl">
                Know Who Gets the Key.
              </h1>
              <p className="max-w-2xl text-xl font-medium leading-8 text-[#0f2343] sm:text-2xl">
                AI-powered tenant screening and rental protection infrastructure for the Greek rental market.
              </p>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                SafeKey helps landlords and property teams open a case, collect documents through a secure
                tenant upload link, track screening progress, and review the final recommendation in one
                product.
              </p>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
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
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#0f2343] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,35,67,0.16)] transition hover:bg-[#0b1931] sm:w-auto"
                href="/login"
              >
                Create your first tenant check
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] border border-[#d8c490] bg-white px-6 py-3 text-sm font-semibold text-[#0f2343] transition hover:border-[#c5aa66] sm:w-auto"
                href="#how-it-works"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative z-[1]">
            <div className="card space-y-6 bg-white/96">
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
                    className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4"
                    key={item}
                  >
                    <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#8b6b17]" />
                    <p className="text-sm leading-7 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Status</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">Live case tracking</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Documents</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">Requested vs received</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Outcome</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f2343]">Score + recommendation</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Product explanation</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              SafeKey is a tenant verification workflow, not a document inbox.
            </h2>
            <p className="text-base leading-8 text-slate-600">
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
                  <p className="text-sm leading-7 text-slate-600">{item.description}</p>
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
                  <p className="text-sm leading-7 text-slate-600">{step.description}</p>
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

          <div className="grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                className={`card space-y-6 ${plan.featured ? "border-[#d8c490] shadow-[0_18px_42px_rgba(15,35,67,0.08)]" : ""}`}
                key={plan.name}
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
                  <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">{plan.price}</p>
                  <p className="text-sm leading-7 text-slate-600">{plan.description}</p>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div className="flex items-start gap-3 text-sm text-slate-700" key={feature}>
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#0f2343]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  className={`inline-flex min-h-12 w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-[#0f2343] text-white hover:bg-[#0b1931]"
                      : "border border-slate-200 bg-slate-50 text-[#0f2343] hover:bg-white"
                  }`}
                  href="/login"
                >
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="brand-hero grid gap-6 p-7 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-[1] space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Ready to start</p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Open your first SafeKey case and run the full tenant screening flow.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-slate-600">
              Create the case, share the upload page, track the documents, and review the recommendation inside
              the dashboard.
            </p>
          </div>

          <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-[#0f2343] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,35,67,0.16)] transition hover:bg-[#0b1931]"
              href="/login"
            >
              Start with SafeKey
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-14 items-center justify-center rounded-[20px] border border-[#d8c490] bg-white px-6 py-3 text-sm font-semibold text-[#0f2343] transition hover:border-[#c5aa66]"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
