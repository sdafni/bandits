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
      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-1 py-1 text-xs font-semibold text-secondary"
      data-testid="language-switcher"
    >
      <button
        aria-pressed={activeLocale === "el"}
        className={`rounded-full px-2.5 py-1 transition ${
          activeLocale === "el" ? "bg-slate-900 text-white" : "hover:bg-slate-100"
        } ${isSwitching ? "opacity-80" : ""}`}
        data-testid="language-switch-el"
        onClick={() => setLocale("el")}
        type="button"
      >
        {t("common.languageEl")}
      </button>
      <span className="px-1 text-muted">|</span>
      <button
        aria-pressed={activeLocale === "en"}
        className={`rounded-full px-2.5 py-1 transition ${
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
