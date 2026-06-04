"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LandlordAppNav, type LandlordNavKey } from "@/components/landlord-app-nav";
import { SiteAuthNav } from "@/components/site-auth-nav";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function AppHeader({
  actions,
  activeNav = "checks",
  homeHref = "/dashboard",
  subtitle,
  title,
  variant = "landlord",
}: {
  title: string;
  subtitle: string;
  homeHref?: string;
  activeNav?: LandlordNavKey | "dashboard" | "billing";
  actions?: React.ReactNode;
  variant?: "landlord" | "admin";
}) {
  const { locale } = useLocale();
  const t = useT();

  const landlordNav: LandlordNavKey =
    activeNav === "billing" ? "plans" : activeNav === "dashboard" ? "checks" : activeNav;

  if (variant === "admin") {
    return (
      <header className="border-b border-[#e2e8f0] bg-white/98 backdrop-blur">
        <div className="page-shell space-y-4 py-4 sm:space-y-5 sm:py-5">
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              <SafeKeyBrand className="mt-1 shrink-0" href={homeHref} priority variant="logo" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t("appNav.reviewDesk")}</p>
                <h1 className="text-balance text-[1.45rem] font-semibold leading-tight text-primary sm:text-2xl">{title}</h1>
                <p className="max-w-3xl text-sm leading-6 text-secondary sm:text-base">{subtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 [&>*]:w-full sm:[&>*]:w-auto">
              <LanguageSwitcher />
              {actions}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-slate-200/90 bg-white">
      <div className="page-shell space-y-4 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <SafeKeyBrand
            className="dashboard-header-brand"
            href={withLocalePath(locale, homeHref)}
            priority
            variant="logo"
          />
          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {actions ?? <SiteAuthNav auth={{ isAuthenticated: true }} variant="toolbar" />}
          </div>
        </div>
        <div className="hidden sm:block">
          <LandlordAppNav active={landlordNav} variant="compact" />
        </div>
        <div className="space-y-1">
          <h1 className="text-balance text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[0.9375rem]">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
