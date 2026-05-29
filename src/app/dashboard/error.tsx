"use client";

import Link from "next/link";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <main className="min-h-screen bg-slate-100/80 px-4 py-10 sm:px-6">
      <div className="card mx-auto max-w-lg space-y-5 text-center">
        <h1 className="text-pretty text-xl font-semibold text-slate-950 sm:text-2xl">{t("dashboard.systemError.title")}</h1>
        <p className="text-pretty text-sm leading-7 text-slate-600">{t("dashboard.systemError.body")}</p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <button className="workspace-cta min-h-12 justify-center rounded-2xl px-6" onClick={reset} type="button">
            {t("dashboard.systemError.tryAgain")}
          </button>
          <Link
            className="workspace-cta-secondary min-h-12 justify-center rounded-2xl px-6 text-sm font-semibold"
            href={withLocalePath(locale, "/")}
          >
            {t("dashboard.planOnboarding.returnHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
