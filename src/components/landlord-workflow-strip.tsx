"use client";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type LandlordWorkflowStripProps = {
  className?: string;
  compact?: boolean;
  highlightStep?: 1 | 2 | 3 | 4 | 5;
};

export function LandlordWorkflowStrip({ className, compact = false, highlightStep }: LandlordWorkflowStripProps) {
  const t = useT();

  const steps = [
    { id: 1, title: t("landlordWorkflow.step1Title"), body: t("landlordWorkflow.step1Body") },
    { id: 2, title: t("landlordWorkflow.step2Title"), body: t("landlordWorkflow.step2Body") },
    { id: 3, title: t("landlordWorkflow.step3Title"), body: t("landlordWorkflow.step3Body") },
    { id: 4, title: t("landlordWorkflow.step4Title"), body: t("landlordWorkflow.step4Body") },
    { id: 5, title: t("landlordWorkflow.step5Title"), body: t("landlordWorkflow.step5Body") },
  ] as const;

  if (compact) {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3", className)}>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("landlordWorkflow.title")}</p>
        <ol className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-2">
          {steps.map((step) => (
            <li
              className={cn(
                "flex min-w-0 items-start gap-2 text-xs leading-5 text-slate-700 sm:max-w-[11rem]",
                highlightStep === step.id && "font-medium text-slate-900",
              )}
              key={step.id}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  highlightStep === step.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
                )}
              >
                {step.id}
              </span>
              <span>{step.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs leading-5 text-slate-600">{t("landlordWorkflow.landlordNote")}</p>
      </div>
    );
  }

  return (
    <section className={cn("rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5", className)}>
      <p className="text-sm font-semibold text-slate-900">{t("landlordWorkflow.title")}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t("landlordWorkflow.subtitle")}</p>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li className="flex gap-3" key={step.id}>
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                highlightStep === step.id ? "bg-emerald-600 text-white" : "bg-slate-900 text-white",
              )}
            >
              {step.id}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-6 text-emerald-950">
        {t("landlordWorkflow.landlordNote")}
      </p>
    </section>
  );
}
