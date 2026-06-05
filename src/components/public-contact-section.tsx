"use client";

import { ArrowRight, LifeBuoy, Mail } from "lucide-react";
import { PublicSupportForm } from "@/components/public-support-form";
import { useLocale } from "@/lib/i18n/context";
import { siteConfig } from "@/lib/site";

export function PublicContactSection() {
  const { t } = useLocale();
  const mailtoHref = `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(t("footer.contactSection.emailSubject"))}`;

  return (
    <section className="scroll-mt-24" data-testid="public-contact-section" id="support">
      <article className="overflow-hidden rounded-[28px] border border-[#d8c490]/55 bg-gradient-to-br from-[#fffaf0] via-white to-slate-50 shadow-[0_22px_48px_rgba(15,35,67,0.08)]">
        <div className="border-b border-[#e8dfc8]/80 bg-white/70 px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-5 sm:gap-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8f1d8] text-[#8b6b17]">
              <LifeBuoy className="h-6 w-6" aria-hidden />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("footer.contactSection.kicker")}</p>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                {t("footer.contactSection.title")}
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">{t("footer.contactSection.body")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-[22px] border border-[#d8c490]/70 bg-white p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("footer.contactSection.emailLabel")}
              </p>
              <a
                className="mt-3 block break-all text-2xl font-semibold tracking-[-0.02em] text-[#0f2343] underline-offset-4 transition hover:underline sm:text-[1.75rem]"
                href={mailtoHref}
              >
                {siteConfig.supportEmail}
              </a>
              <p className="mt-3 text-base leading-7 text-slate-600">{t("footer.contactSection.emailHint")}</p>
              <a
                className="primary-action cta-breathe mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] px-6 py-3 text-base font-semibold sm:w-auto"
                href={mailtoHref}
              >
                <Mail className="h-5 w-5" aria-hidden />
                {t("footer.contactSection.emailCta")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-sm font-medium text-slate-500">{t("footer.contactSection.formDivider")}</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <PublicSupportForm variant="support-center" />
          </div>
        </div>
      </article>
    </section>
  );
}
