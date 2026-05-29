"use client";

import { useT } from "@/lib/i18n/context";

export function DashboardLandlordOnboarding() {
  const t = useT();

  const steps = [
    { body: t("dashboard.onboardingStep1Body"), title: t("dashboard.onboardingStep1Title") },
    { body: t("dashboard.onboardingStep2Body"), title: t("dashboard.onboardingStep2Title") },
    { body: t("dashboard.onboardingStep3Body"), title: t("dashboard.onboardingStep3Title") },
  ];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5">
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li className="flex gap-3.5" key={step.title}>
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f2343] text-sm font-semibold text-white"
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
