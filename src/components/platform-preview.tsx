"use client";

import { AlertCircle, BadgeCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { getDemoCasePresentationCards } from "@/lib/demo-data";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type PlatformPreviewProps = {
  className?: string;
};

export function PlatformPreview({ className }: PlatformPreviewProps) {
  const t = useT();
  const cases = getDemoCasePresentationCards();
  const featured = cases.find((item) => item.recommendation === "conditional") ?? cases[0];
  const queue = cases.slice(0, 3);

  return (
    <section className={cn("brand-visual-card gap-4 p-5 sm:p-6", className)}>
      <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#334155]">{t("platformPreview.kicker")}</p>
          <h3 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-950">{t("platformPreview.title")}</h3>
        </div>

        <div className="inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#334155]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#183454]" />
          {t("nav.tenantPassport")}
        </div>
      </div>

      <div className="brand-visual-frame relative z-[1] p-3 sm:p-4">
        <div className="overflow-hidden rounded-[24px] border border-[#d3dbe7] bg-white shadow-[0_10px_22px_rgba(15,35,67,0.05)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#dce4ee] px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b]">
                {t("platformPreview.reviewDesk")}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0f2343]">{t("platformPreview.progressLabel")}</p>
            </div>

            <div className="rounded-full bg-[#f3f6fa] px-3 py-1.5 text-xs font-medium text-[#334155]">
              {cases.length} {t("platformPreview.presentationCases")}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-[#dce4ee] bg-[#f8fafc] p-4 lg:border-b-0 lg:border-r">
              <div className="space-y-3">
                {queue.map((item, index) => (
                  <div
                    className={cn(
                      "rounded-[18px] px-4 py-3 transition",
                      index === 0 ? "bg-white shadow-[0_6px_16px_rgba(15,35,67,0.06)]" : "bg-transparent",
                    )}
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0f2343]">{item.tenantName}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-700">{item.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b]">
                    {t("platformPreview.caseOverview")}
                  </p>
                  <p className="text-lg font-semibold tracking-[-0.02em] text-[#0f2343]">{featured.tenantName}</p>
                </div>

                <div className="rounded-full border border-[#e5ddd0] bg-[#fbf9f5] px-3 py-1 text-xs font-medium text-[#5d4e31]">
                  {featured.recommendation} {t("platformPreview.recommendation")}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-[#e4ebf3] bg-[#f8fafc] p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="mt-2 text-xs font-medium text-[#0f2343]">{t("platformPreview.verificationRequest")}</p>
                </div>
                <div className="rounded-[18px] border border-[#e4ebf3] bg-[#f8fafc] p-3">
                  <BadgeCheck className="h-4 w-4 text-[#183454]" />
                  <p className="mt-2 text-xs font-medium text-[#0f2343]">{t("platformPreview.documentsReceived")}</p>
                </div>
                <div className="rounded-[18px] border border-[#e4ebf3] bg-[#f8fafc] p-3">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="mt-2 text-xs font-medium text-[#0f2343]">{t("platformPreview.reportReady")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
