"use client";

import { ShieldCheck } from "lucide-react";
import { TrustSignalsStrip } from "@/components/trust-signals-strip";
import { useT } from "@/lib/i18n/context";

export function DashboardWelcomeEmpty({
  onStartCheck,
}: {
  onStartCheck: () => void;
}) {
  const t = useT();

  const steps = [
    t("dashboard.welcome.step1"),
    t("dashboard.welcome.step2"),
    t("dashboard.welcome.step3"),
    t("dashboard.welcome.step4"),
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2343] text-white">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
        </div>

        <h1 className="mx-auto mt-5 max-w-md text-center text-xl font-semibold text-slate-950 sm:text-2xl">
          {t("dashboard.welcome.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-center text-sm leading-7 text-slate-600">
          {t("dashboard.welcome.subtitle")}
        </p>

        <ol className="mx-auto mt-6 max-w-md space-y-3">
          {steps.map((step, index) => (
            <li className="flex items-start gap-3 text-left" key={step}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="pt-0.5 text-sm font-medium leading-6 text-slate-800 sm:text-[0.9375rem]">{step}</p>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          <button
            className="workspace-cta min-h-[3.25rem] w-full justify-center rounded-2xl text-base font-semibold sm:min-h-14"
            data-testid="dashboard-welcome-cta"
            onClick={onStartCheck}
            type="button"
          >
            {t("dashboard.welcome.cta")}
          </button>
        </div>
      </div>

      <TrustSignalsStrip />
    </section>
  );
}
