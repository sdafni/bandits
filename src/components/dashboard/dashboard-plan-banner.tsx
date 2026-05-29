"use client";

import Link from "next/link";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function DashboardPlanBanner({ billingNavEnabled = false }: { billingNavEnabled?: boolean }) {
  const t = useT();
  const { locale } = useLocale();

  if (!billingNavEnabled) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200/90 bg-amber-50 px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-amber-950">{t("dashboard.planBanner.title")}</p>
      <p className="mt-1 text-sm leading-6 text-amber-900">{t("dashboard.planBanner.body")}</p>
      <Link
        className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0f2343] px-4 py-2 text-sm font-semibold text-white"
        data-testid="dashboard-choose-plan"
        href={withLocalePath(locale, "/dashboard/billing")}
      >
        {t("dashboard.planOnboarding.choosePlan")}
      </Link>
    </section>
  );
}
