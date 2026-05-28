import Link from "next/link";
import { FileLock2, LifeBuoy, ShieldCheck } from "lucide-react";
import { PublicSupportForm } from "@/components/public-support-form";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { getRequestLocale } from "@/lib/i18n-server";
import { siteConfig } from "@/lib/site";

const trustItems = [
  {
    title: "GDPR and data protection",
    description:
      "SafeKey is designed for privacy-conscious document workflows, role-scoped access, and responsible handling of applicant information.",
    icon: ShieldCheck,
  },
  {
    title: "Secure document handling",
    description:
      "Applicant files move through private upload links, tracked submission states, and review-aware storage controls.",
    icon: FileLock2,
  },
  {
    title: "Support and accountability",
    description:
      "Operational support, screening questions, and platform assistance are available through a direct product support channel.",
    icon: LifeBuoy,
  },
] as const;

export async function PublicSiteFooter({ showTrustLayer = true }: { showTrustLayer?: boolean }) {
  const locale = await getRequestLocale();
  const isGreek = locale === "el";
  return (
    <div className="space-y-6">
      {showTrustLayer ? (
        <section className="brand-hero grid gap-5 p-7 sm:p-8 lg:grid-cols-3">
          {trustItems.map((item) => (
            <article className="brand-panel space-y-3" key={item.title}>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8f1d8] text-[#8b6b17]">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="text-sm leading-7 text-slate-700">{item.description}</p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <footer className="brand-hero p-7 sm:p-8">
        <div className="relative z-[1] grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <SafeKeyBrand href="/" variant="logo" />
            <p className="max-w-xl text-base leading-8 text-slate-700">{siteConfig.defaultDescription}</p>
            <div className="flex flex-wrap gap-3 text-sm text-[#42526b]">
              <span className="rounded-full border border-[#d8c490] bg-[#fffaf0] px-3 py-1.5 font-medium text-[#6d5a2a]">
                {siteConfig.marketLine}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">
                Secure document workflows
              </span>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-3" id="support">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Legal</p>
              <div className="space-y-2 text-sm text-slate-700">
                <Link className="block transition hover:text-[#0f2343]" href="/privacy">
                  Privacy Policy
                </Link>
                <Link className="block transition hover:text-[#0f2343]" href="/terms">
                  Terms of Service
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Data protection</p>
              <p className="text-sm leading-7 text-slate-700">
                GDPR-aware workflows, role-based review access, and secure handling of uploaded rental documents.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Contact</p>
              <p className="text-sm leading-7 text-slate-700">
                {isGreek
                  ? "Χρειάζεσαι βοήθεια με ελέγχους ή πρόσβαση; Στείλε ασφαλές μήνυμα υποστήριξης."
                  : "Need help with screening operations or platform access? Send a secure support message."}
              </p>
              <PublicSupportForm />
            </div>
          </div>
        </div>

        <div className="relative z-[1] mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-[#42526b] sm:flex-row sm:items-center sm:justify-between">
          <p>{siteConfig.tagline}</p>
          <p>{siteConfig.marketLine}</p>
        </div>
      </footer>
    </div>
  );
}
