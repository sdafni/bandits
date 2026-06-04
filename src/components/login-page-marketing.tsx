"use client";

import { useT } from "@/lib/i18n/context";

export function LoginPageMarketing() {
  const t = useT();

  return (
    <div className="space-y-5 lg:max-w-xl lg:pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5a6980] sm:text-sm">{t("hero.kicker")}</p>
      <div className="space-y-4 sm:space-y-5">
        <h1 className="text-pretty text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl xl:text-[3.5rem]">
          {t("auth.loginHeroTitle")}
        </h1>
        <p className="max-w-xl text-lg font-medium leading-8 text-[#0f2343]">{t("auth.loginHeroSubtitle")}</p>
        <p className="max-w-lg text-base leading-7 text-slate-600">{t("auth.loginHeroBody")}</p>
      </div>
    </div>
  );
}
