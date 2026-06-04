"use client";

import { FileText, LayoutDashboard, ShieldCheck, Upload } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export function LandingProductPreview() {
  const t = useT();

  const previews = [
    {
      icon: LayoutDashboard,
      label: t("landing.preview.dashboard"),
      content: (
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-slate-900">Elena K.</p>
              <p className="text-[10px] text-slate-500">Kolonaki Residence</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              {t("landing.preview.reportReady")}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-slate-900">Nikos P.</p>
              <p className="text-[10px] text-slate-500">Glyfada Flat</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              {t("landing.preview.awaiting")}
            </span>
          </div>
        </div>
      ),
    },
    {
      icon: Upload,
      label: t("landing.preview.upload"),
      content: (
        <div className="space-y-2 p-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t("landing.preview.passport")}</p>
            <p className="mt-1 text-xs font-medium text-[#0f2343]">{t("landing.preview.uploaded")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t("landing.preview.payslips")}</p>
            <p className="mt-1 text-xs text-slate-500">{t("landing.preview.pending")}</p>
          </div>
        </div>
      ),
    },
    {
      icon: ShieldCheck,
      label: t("landing.preview.trustReport"),
      content: (
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0f2343] text-lg font-bold text-white">
              77
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t("landing.preview.trustScore")}</p>
              <p className="text-sm font-semibold text-slate-900">{t("landing.preview.mediumRisk")}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">{t("landing.preview.trustSummary")}</p>
        </div>
      ),
    },
    {
      icon: FileText,
      label: t("landing.preview.recommendation"),
      content: (
        <div className="space-y-3 p-4">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
            {t("landing.preview.approve")}
          </span>
          <p className="text-xs leading-5 text-slate-700">{t("landing.preview.recommendationBody")}</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-600">
            SafeKey_Report.pdf
          </div>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="product-preview-title" className="space-y-5">
      <h2 className="sr-only" id="product-preview-title">
        {t("landing.preview.title")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {previews.map((item) => (
          <article
            className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,35,67,0.06)]"
            key={item.label}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2">
              <item.icon className="h-4 w-4 text-[#8b6b17]" aria-hidden />
              <p className="text-xs font-semibold text-slate-800">{item.label}</p>
            </div>
            {item.content}
          </article>
        ))}
      </div>
    </section>
  );
}
