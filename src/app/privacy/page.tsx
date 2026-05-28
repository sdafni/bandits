import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { SafeKeyBrand } from "@/components/safekey-brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read how SafeKey handles applicant information, secure document workflows, and privacy responsibilities across the Greek rental market.",
};

const sections = [
  {
    title: "What SafeKey collects",
    body:
      "SafeKey collects account information, tenant case details, submitted rental screening documents, and workflow activity needed to operate the platform and support rental decisioning.",
  },
  {
    title: "How data is used",
    body:
      "Information is used to create tenant checks, process document submissions, support screening reviews, generate structured outputs, and maintain product operations for landlords, agents, and administrators.",
  },
  {
    title: "Secure document handling",
    body:
      "Uploaded files are handled through private upload links, scoped access controls, and platform workflows designed to reduce unnecessary document exposure during tenant screening.",
  },
  {
    title: "GDPR and data protection",
    body:
      "SafeKey is designed with GDPR-aware handling in mind, including limited-access workflows, operational logging, and controlled review processes for personal rental screening information.",
  },
  {
    title: "Contact",
    body: "For privacy or data handling questions, use the secure support form.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="brand-hero space-y-6 p-7 sm:p-8">
          <div className="space-y-4">
            <SafeKeyBrand href="/" priority variant="logo" />
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Privacy Policy</p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Privacy and secure data handling for SafeKey.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
                This policy explains the platform-level principles used for rental screening data, document
                handling, and operational privacy across SafeKey.
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
