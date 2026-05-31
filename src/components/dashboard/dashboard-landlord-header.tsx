"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LandlordAppNav } from "@/components/landlord-app-nav";
import type { LandlordNavKey } from "@/components/landlord-app-nav";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function DashboardLandlordHeader({
  activeNav = "checks",
  welcomeMode = false,
}: {
  activeNav?: LandlordNavKey;
  billingNavEnabled?: boolean;
  welcomeMode?: boolean;
}) {
  const { locale } = useLocale();
  const t = useT();

  return (
    <header className="border-b border-slate-200/90 bg-white">
      <div className="px-4 pb-4 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <SafeKeyBrand
            className="dashboard-header-brand"
            href={withLocalePath(locale, "/dashboard")}
            priority
            variant="logo"
          />
          <div className="shrink-0">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-4 hidden sm:block">
          <LandlordAppNav active={activeNav} variant="compact" />
        </div>

        <div className="mt-5 space-y-2">
          <h1 className="text-pretty text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {welcomeMode ? t("dashboard.welcome.title") : t("dashboard.title")}
          </h1>
          <p className="text-pretty text-sm leading-6 text-slate-600 sm:text-[0.9375rem]">
            {welcomeMode ? t("dashboard.welcome.subtitle") : t("dashboard.subtitle")}
          </p>
        </div>
      </div>
    </header>
  );
}
