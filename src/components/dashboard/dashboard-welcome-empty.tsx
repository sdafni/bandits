"use client";

import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { TrustSignalsStrip } from "@/components/trust-signals-strip";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function DashboardWelcomeEmpty({
  billingNavEnabled = false,
  needsPlan = false,
  onStartCheck,
}: {
  billingNavEnabled?: boolean;
  needsPlan?: boolean;
  onStartCheck: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();

  const steps = needsPlan
    ? [
        t("dashboard.welcome.step1"),
        t("dashboard.welcome.step2Plan"),
        t("dashboard.welcome.step3"),
        t("dashboard.welcome.step4"),
      ]
    : [
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

        {needsPlan ? (
          <p className="mx-auto mt-5 max-w-md text-center text-sm leading-7 text-slate-600">
            {t("dashboard.welcome.optionAIntro")}
          </p>
        ) : null}

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

        {needsPlan ? (
          <div className="mx-auto mt-5 flex max-w-md items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs leading-5 text-slate-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <p>{t("dashboard.welcome.lockedUntilPlan")}</p>
          </div>
        ) : null}

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          <button
            className="workspace-cta min-h-[3.25rem] w-full justify-center rounded-2xl text-base font-semibold sm:min-h-14"
            data-testid="dashboard-welcome-cta"
            onClick={onStartCheck}
            type="button"
          >
            {t("dashboard.welcome.cta")}
          </button>
          {needsPlan && billingNavEnabled ? (
            <Link
              className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold"
              href={withLocalePath(locale, "/dashboard/billing")}
            >
              {t("dashboard.planOnboarding.choosePlan")}
            </Link>
          ) : null}
        </div>
      </div>

      <TrustSignalsStrip />
    </section>
  );
}
