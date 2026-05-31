"use client";

import { useT } from "@/lib/i18n/context";

export function DashboardPlanBanner({ billingNavEnabled = false }: { billingNavEnabled?: boolean }) {
  const t = useT();

  if (!billingNavEnabled) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200/90 bg-amber-50 px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-amber-950">{t("checkCreated.planRequiredTitle")}</p>
      <p className="mt-1 text-sm leading-6 text-amber-900">{t("checkCreated.planRequiredBody")}</p>
    </section>
  );
}
