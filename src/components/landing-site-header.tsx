"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { buildPrimaryConversionHref } from "@/lib/billing-navigation";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";
import type { SiteAuthState } from "@/lib/site-auth-state";

const navLinkClass =
  "inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950";

export function LandingSiteHeader({ auth }: { auth: SiteAuthState }) {
  const { locale } = useLocale();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  const homePath = withLocalePath(locale, "/");
  const signInPath = withLocalePath(locale, "/login#auth");
  const dashboardPath = withLocalePath(locale, "/dashboard");
  const startPath = buildPrimaryConversionHref(locale, auth);

  const links = [
    { href: `${homePath}#pricing`, label: t("nav.pricing") },
    { href: `${homePath}#how-it-works`, label: t("nav.howItWorks") },
    auth.isAuthenticated
      ? { href: dashboardPath, label: t("nav.dashboard") }
      : { href: signInPath, label: t("nav.login") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="page-shell flex items-center justify-between gap-4 py-3 sm:py-4">
        <SafeKeyBrand priority variant="logo" />

        <nav aria-label={t("nav.mainLabel")} className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link className={navLinkClass} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <Link className="primary-action cta-breathe ml-2 min-h-10 rounded-[14px] px-4 py-2 text-sm" href={startPath}>
            {t("nav.getStarted")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-800"
            onClick={() => setMobileOpen((open) => !open)}
            type="button"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="page-shell flex flex-col gap-1 py-3">
            {links.map((link) => (
              <Link
                className="min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                href={link.href}
                key={link.href}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              className="primary-action cta-breathe mt-2 min-h-11 justify-center rounded-[14px] px-4 py-2.5 text-sm"
              href={startPath}
              onClick={() => setMobileOpen(false)}
            >
              {t("nav.getStarted")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
