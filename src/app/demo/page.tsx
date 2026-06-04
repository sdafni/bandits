import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicSiteHeaderServer } from "@/components/public-site-header-server";
import { Badge } from "@/components/badge";
import {
  getDemoCasePresentationCards,
  getDemoPaymentHistory,
  getDemoRouteExamples,
  getDemoWalkthroughSteps,
} from "@/lib/demo-data";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Investor Demo",
  description:
    "Guided SafeKey walkthrough for investors and clients covering screening, review, billing, and rental protection outcomes.",
};

const outcomeTone = {
  approve: "success",
  conditional: "warning",
  decline: "danger",
} as const;

export default async function DemoPage() {
  const steps = getDemoWalkthroughSteps();
  const cases = getDemoCasePresentationCards();
  const payments = getDemoPaymentHistory();
  const routes = getDemoRouteExamples();

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-8 lg:gap-12 lg:py-12">
        <PublicSiteHeaderServer />

        <section className="brand-hero space-y-6 p-7 sm:p-8">
          <div className="relative z-[1] space-y-4">
            <p className="section-kicker">Investor and client demo</p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              SafeKey end-to-end rental trust infrastructure for Greece.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              This guided walkthrough shows how landlords open a case, tenants upload evidence, analysts review
              the file, AI publishes a recommendation, and billing unlocks report generation — without requiring
              production seed data.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe2eb] bg-white px-4 py-2 text-sm font-medium text-[#334155]">
              <ShieldCheck className="h-4 w-4 text-[#183454]" />
              {siteConfig.marketLine}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <p className="section-kicker">Guided flow</p>
            <h2 className="section-title">Six-step investor narrative</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <Link
                className="premium-panel group block space-y-3 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,35,67,0.08)]"
                href={step.href}
                key={step.step}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b6b17]">{step.step}</p>
                <h3 className="text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="text-sm leading-7 text-slate-700">{step.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f2343]">
                  Open step
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="premium-panel space-y-5">
            <div>
              <p className="section-kicker">Decision outcomes</p>
              <h2 className="section-title text-2xl">Approval, conditional, and rejection examples</h2>
            </div>
            <div className="space-y-3">
              {cases
                .filter((item) => item.status === "report_ready")
                .map((item) => (
                  <article
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white p-4"
                    key={item.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.tenantName}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.label}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={outcomeTone[item.recommendation]}>{item.recommendation}</Badge>
                      <Badge tone="info">Score {item.riskScore}</Badge>
                      <Link
                        className="secondary-action min-h-10 rounded-[16px] px-4 py-2 text-sm"
                        href={`/dashboard/checks/${item.id}`}
                      >
                        View case
                      </Link>
                    </div>
                  </article>
                ))}
            </div>
          </div>

          <div className="premium-panel space-y-5">
            <div>
              <p className="section-kicker">Billing signals</p>
              <h2 className="section-title text-2xl">Payment history preview</h2>
            </div>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div className="rounded-[24px] border border-slate-200 bg-white p-4" key={payment.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{payment.label}</p>
                    <Badge
                      tone={payment.status === "paid" ? "success" : payment.status === "failed" ? "danger" : "warning"}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{payment.amount}</p>
                </div>
              ))}
            </div>
            <Link className="secondary-action w-full min-h-12 rounded-[18px] px-5 py-3" href="/dashboard/billing">
              Open billing workspace
            </Link>
          </div>
        </section>

        <section className="premium-panel space-y-4">
          <p className="section-kicker">Quick links</p>
          <div className="flex flex-wrap gap-3">
            <Link className="secondary-action min-h-11 rounded-[16px] px-4 py-2 text-sm" href={routes.landlordApproved}>
              Approved case
            </Link>
            <Link className="secondary-action min-h-11 rounded-[16px] px-4 py-2 text-sm" href={routes.adminConditional}>
              Conditional review
            </Link>
            <Link className="secondary-action min-h-11 rounded-[16px] px-4 py-2 text-sm" href={routes.landlordHighRisk}>
              Declined case
            </Link>
            <Link className="secondary-action min-h-11 rounded-[16px] px-4 py-2 text-sm" href={routes.uploadPending}>
              Expat upload pending
            </Link>
          </div>
        </section>

        <PublicSiteFooter showTrustLayer={false} />
      </section>
    </main>
  );
}
