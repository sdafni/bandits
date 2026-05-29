"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type AppLocale,
  detectLocaleFromPath,
  stripLocaleFromPath,
  withLocalePath,
} from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string) => string;
  isSwitching: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function setLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: AppLocale;
}) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const [isSwitching, startTransition] = useTransition();
  const pathLocale = detectLocaleFromPath(pathname) ?? initialLocale;
  const [locale, setLocaleState] = useState<AppLocale>(pathLocale);

  useEffect(() => {
    const fromPath = detectLocaleFromPath(pathname);
    if (fromPath) {
      setLocaleState(fromPath);
      document.documentElement.lang = fromPath;
    }
  }, [pathname]);

  const setLocale = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === locale) {
        return;
      }

      setLocaleState(nextLocale);
      setLocaleCookie(nextLocale);
      document.documentElement.lang = nextLocale;

      const query = searchParams.toString();
      const strippedPath = stripLocaleFromPath(pathname);
      const localizedPath = withLocalePath(nextLocale, strippedPath);
      const nextUrl = query ? `${localizedPath}?${query}` : localizedPath;

      startTransition(() => {
        window.history.replaceState(window.history.state, "", nextUrl);
      });
    },
    [locale, pathname, searchParams],
  );

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      isSwitching,
    }),
    [isSwitching, locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    return {
      locale: DEFAULT_LOCALE as AppLocale,
      setLocale: () => {},
      t: (key: string) => translate(DEFAULT_LOCALE, key),
      isSwitching: false,
    };
  }
  return context;
}

export function useT() {
  return useLocale().t;
}
