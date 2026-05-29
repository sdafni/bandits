"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function LoginPageMarketing() {
  const { locale } = useLocale();
  const t = useT();

  return (
    <div className="space-y-7 xl:max-w-[38rem]">
      <div className="space-y-4">
        <div className="inline-flex rounded-[30px] bg-white px-4 py-4 sm:rounded-[36px] sm:px-6 sm:py-5">
          <SafeKeyBrand href={withLocalePath(locale, "/")} priority variant="logo" />
        </div>
        <LanguageSwitcher />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5a6980] sm:text-sm">{t("hero.kicker")}</p>
      </div>

      <div className="space-y-4 sm:space-y-5">
        <h1 className="text-pretty text-[3rem] font-semibold leading-[0.92] tracking-[-0.08em] text-slate-950 sm:text-[4.5rem] xl:text-[6.4rem]">
          {t("auth.loginHeroTitle")}
        </h1>
        <p className="max-w-[30rem] text-pretty text-[1rem] font-medium leading-7 text-[#0f2343] sm:text-[1.35rem] sm:leading-8">
          {t("auth.loginHeroSubtitle")}
        </p>
        <p className="max-w-[27rem] text-[15px] leading-7 text-slate-600 sm:text-[1rem]">{t("auth.loginHeroBody")}</p>
      </div>
    </div>
  );
}
