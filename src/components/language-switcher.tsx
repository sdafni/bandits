"use client";

import { type AppLocale } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/context";

type LanguageSwitcherProps = {
  locale?: AppLocale;
};

export function LanguageSwitcher({ locale: localeProp }: LanguageSwitcherProps) {
  const { locale, setLocale, t, isSwitching } = useLocale();
  const activeLocale = localeProp ?? locale;

  return (
    <div
      className="language-switcher language-switcher--mobile-compact"
      data-testid="language-switcher"
    >
      <button
        aria-pressed={activeLocale === "el"}
        className={`language-switcher__option language-switcher__option--mobile-compact ${
          activeLocale === "el" ? "bg-slate-900 text-white" : "hover:bg-slate-100"
        } ${isSwitching ? "opacity-80" : ""}`}
        data-testid="language-switch-el"
        onClick={() => setLocale("el")}
        type="button"
      >
        {t("common.languageEl")}
      </button>
      <span className="px-0.5 text-muted sm:px-1">|</span>
      <button
        aria-pressed={activeLocale === "en"}
        className={`language-switcher__option language-switcher__option--mobile-compact ${
          activeLocale === "en" ? "bg-slate-900 text-white" : "hover:bg-slate-100"
        } ${isSwitching ? "opacity-80" : ""}`}
        data-testid="language-switch-en"
        onClick={() => setLocale("en")}
        type="button"
      >
        {t("common.languageEn")}
      </button>
    </div>
  );
}
