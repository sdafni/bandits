"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { SiteAuthNav } from "@/components/site-auth-nav";
import type { SiteAuthState } from "@/lib/site-auth-state";
import { useT } from "@/lib/i18n/context";

export function PublicSiteHeader({
  auth,
  children,
}: {
  auth: SiteAuthState;
  children?: ReactNode;
}) {
  const t = useT();

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <SafeKeyBrand priority variant="logo" />
        <div className="hidden rounded-full border border-[#cfb06a] bg-white px-4 py-2 text-sm font-semibold text-[#0f2343] shadow-[0_6px_16px_rgba(15,35,67,0.05)] md:inline-flex">
          {t("nav.tenantPassport")}
        </div>
        <LanguageSwitcher />
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {children}
        <SiteAuthNav auth={auth} variant="public" />
      </div>
    </div>
  );
}
