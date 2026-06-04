"use client";

import Link from "next/link";
import { ArrowRight, FileDown } from "lucide-react";
import { buildStartCheckLoginHref } from "@/lib/billing-navigation";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function LandingSampleReport() {
  const { locale } = useLocale();
  const t = useT();
  const startPath = buildStartCheckLoginHref(locale);
  const samplePath = withLocalePath(locale, "/sample-report");

  return (
    <section className="scroll-mt-20" id="sample-report">
      <div className="grid gap-6 rounded-[28px] border border-[#d8c490]/60 bg-gradient-to-br from-[#fffaf0] via-white to-slate-50 p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("landing.sample.kicker")}</p>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{t("landing.sample.title")}</h2>
          <p className="text-base leading-7 text-slate-700">{t("landing.sample.body")}</p>
          <Link className="primary-action cta-breathe inline-flex min-h-12 items-center gap-2 rounded-[16px] px-5 py-3 text-sm" href={samplePath}>
            {t("landing.sample.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,35,67,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0f2343] text-2xl font-bold text-white">
                77
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.sample.trustScore")}</p>
                <p className="text-lg font-semibold text-slate-950">{t("landing.sample.scoreLabel")}</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
              {t("landing.sample.recommendation")}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.sample.riskSummary")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{t("landing.sample.riskBody")}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <FileDown className="h-4 w-4 text-[#8b6b17]" />
                {t("landing.sample.pdfLabel")}
              </div>
              <span className="text-xs text-slate-500">PDF</span>
            </div>
          </div>

          <Link className="secondary-action mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] text-sm" href={startPath}>
            {t("hero.ctaPrimary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
