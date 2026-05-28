export const SUPPORTED_LOCALES = ["el", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "el";
export const LOCALE_COOKIE = "safekey_locale";

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return value === "el" || value === "en";
}

export function detectLocaleFromPath(pathname: string): AppLocale | null {
  const segment = pathname.split("/").filter(Boolean)[0] ?? null;
  return isSupportedLocale(segment) ? segment : null;
}

export function stripLocaleFromPath(pathname: string) {
  const locale = detectLocaleFromPath(pathname);
  if (!locale) {
    return pathname;
  }
  const stripped = pathname.replace(`/${locale}`, "");
  return stripped.length > 0 ? stripped : "/";
}

export function pickLocaleFromAcceptLanguage(acceptLanguageHeader: string | null): AppLocale {
  if (!acceptLanguageHeader) {
    return DEFAULT_LOCALE;
  }

  const lowered = acceptLanguageHeader.toLowerCase();
  if (lowered.includes("el")) {
    return "el";
  }
  if (lowered.includes("en")) {
    return "en";
  }

  return DEFAULT_LOCALE;
}

export function withLocalePath(locale: AppLocale, pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const stripped = stripLocaleFromPath(normalized);
  return stripped === "/" ? `/${locale}` : `/${locale}${stripped}`;
}
