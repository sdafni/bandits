import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { SafeKeyBrand } from "@/components/safekey-brand";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review the SafeKey service terms covering platform access, acceptable use, screening workflows, and support responsibilities.",
};

const sections = [
  {
    title: "Platform access",
    body:
      "SafeKey provides rental screening workflow tools for landlords, agents, and property teams. Access to the platform is limited to authorized users and approved account holders.",
  },
  {
    title: "Acceptable use",
    body:
      "Users must only submit lawful rental screening information, use secure upload links appropriately, and avoid any misuse of applicant data, platform workflows, or account access.",
  },
  {
    title: "Screening outputs",
    body:
      "SafeKey provides structured screening signals, reports, and workflow states to support rental decisioning. Users remain responsible for their own legal, commercial, and tenancy decisions.",
  },
  {
    title: "Support and service operations",
    body:
      "SafeKey may update, improve, or maintain platform features over time to preserve security, product quality, and workflow reliability.",
  },
  {
    title: "Contact",
    body: "For service or legal questions, use the secure support form.",
  },
] as const;

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="brand-hero space-y-6 p-7 sm:p-8">
          <div className="space-y-4">
            <SafeKeyBrand href="/" priority variant="logo" />
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Terms of Service</p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Terms for access to the SafeKey screening platform.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
                These terms outline the operating principles for account access, workflow use, and platform
                responsibilities across SafeKey.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          {sections.map((section) => (
            <article className="card space-y-3" key={section.title}>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{section.title}</h2>
              <p className="text-base leading-8 text-slate-700">{section.body}</p>
              {section.title === "Contact" ? (
                <Link className="workspace-cta-secondary inline-flex" href="/#support">
                  Open support form
                </Link>
              ) : null}
            </article>
          ))}
        </section>

        <PublicSiteFooter showTrustLayer={false} />
      </div>
    </main>
  );
}
