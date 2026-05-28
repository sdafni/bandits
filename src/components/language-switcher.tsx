"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type AppLocale, detectLocaleFromPath, withLocalePath } from "@/lib/i18n";

type LanguageSwitcherProps = {
  locale: AppLocale;
};

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const path = pathname || "/";
  const currentLocale = detectLocaleFromPath(path) ?? locale;

  function buildHref(nextLocale: AppLocale) {
    const localizedPath = withLocalePath(nextLocale, path);
    return query ? `${localizedPath}?${query}` : localizedPath;
  }

  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-1 py-1 text-xs font-semibold text-secondary">
      <Link
        className={`rounded-full px-2.5 py-1 transition ${
          currentLocale === "el" ? "bg-slate-900 text-white" : "hover:bg-slate-100"
        }`}
        href={buildHref("el")}
      >
        Ελληνικά
      </Link>
      <span className="px-1 text-muted">|</span>
      <Link
        className={`rounded-full px-2.5 py-1 transition ${
          currentLocale === "en" ? "bg-slate-900 text-white" : "hover:bg-slate-100"
        }`}
        href={buildHref("en")}
      >
        English
      </Link>
    </div>
  );
}
