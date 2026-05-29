"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DashboardProfileMenu } from "@/components/dashboard/dashboard-profile-menu";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function DashboardLandlordHeader({
  billingNavEnabled = false,
  welcomeMode = false,
}: {
  billingNavEnabled?: boolean;
  welcomeMode?: boolean;
}) {
  const { locale } = useLocale();
  const t = useT();

  return (
    <header className="border-b border-slate-200/90 bg-white">
      <div className="px-4 pb-5 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <SafeKeyBrand
            className="h-9 w-auto max-w-[140px] sm:h-10 sm:max-w-[160px]"
            href={withLocalePath(locale, "/dashboard")}
            priority
            variant="logo"
          />
          <div className="flex items-center gap-1.5">
            {billingNavEnabled ? (
              <Link
                className="workspace-cta-secondary hidden min-h-10 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold sm:inline-flex"
                href={withLocalePath(locale, "/dashboard/billing")}
              >
                {t("dashboard.accountBilling")}
              </Link>
            ) : null}
            <LanguageSwitcher />
            <DashboardProfileMenu billingNavEnabled={billingNavEnabled} />
          </div>
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
