"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";
import { WorkspaceRibbon } from "@/components/workspace-ribbon";

export function AppHeader({
  actions,
  activeNav = "dashboard",
  homeHref = "/dashboard",
  subtitle,
  title,
  variant = "landlord",
}: {
  title: string;
  subtitle: string;
  homeHref?: string;
  activeNav?: "dashboard" | "billing";
  actions?: React.ReactNode;
  variant?: "landlord" | "admin";
}) {
  const { locale } = useLocale();
  const t = useT();

  const ribbonItems =
    variant === "admin"
      ? [
          {
            active: activeNav === "dashboard",
            href: homeHref,
            label: t("appNav.reviewDesk"),
          },
        ]
      : [
          {
            active: activeNav === "dashboard",
            href: withLocalePath(locale, homeHref),
            label: t("appNav.dashboard"),
          },
          {
            active: activeNav === "billing",
            href: withLocalePath(locale, "/dashboard/billing"),
            label: t("appNav.billing"),
          },
        ];

  return (
    <header className="border-b border-[#e2e8f0] bg-white/98 backdrop-blur">
      <div className="page-shell space-y-4 py-4 sm:space-y-5 sm:py-5">
        <WorkspaceRibbon items={ribbonItems} statusLabel={t("appNav.trustLayer")} />

        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <Link
                className="hidden rounded-full border border-[#dbe2eb] bg-[#f7f9fc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b] transition hover:border-[#c5d0de] hover:bg-white sm:inline-flex"
                href={withLocalePath(locale, homeHref)}
              >
                {t("appNav.workspacePill")}
              </Link>
            </div>
            <div className="flex items-start gap-3 sm:gap-4">
              <SafeKeyBrand className="mt-1 shrink-0" href={withLocalePath(locale, homeHref)} priority variant="logo" />
              <div className="min-w-0 pl-0 sm:pl-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary sm:tracking-[0.24em]">
                  {t("nav.tenantPassport")}
                </p>
                <h1 className="text-balance text-[1.45rem] font-semibold leading-tight text-primary sm:text-2xl">{title}</h1>
                <p className="max-w-3xl text-sm leading-6 text-secondary sm:text-base">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            <LanguageSwitcher />
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}
