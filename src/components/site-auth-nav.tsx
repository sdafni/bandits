"use client";

import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { buildDashboardStartCheckPath, buildStartCheckLoginHref } from "@/lib/billing-navigation";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";
import type { SiteAuthState } from "@/lib/site-auth-state";

export type { SiteAuthState };

const toolbarLinkClass =
  "inline-flex min-h-10 items-center rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:min-h-0 sm:px-3";

export function SiteAuthNav({
  auth,
  variant = "public",
}: {
  auth: SiteAuthState;
  variant?: "public" | "toolbar";
}) {
  const { locale } = useLocale();
  const t = useT();
  const signInPath = withLocalePath(locale, "/login");
  const dashboardPath = withLocalePath(locale, "/dashboard");
  const accountPath = withLocalePath(locale, "/dashboard/account");
  const startCheckPath = auth.isAuthenticated
    ? buildDashboardStartCheckPath(locale)
    : buildStartCheckLoginHref(locale);

  if (variant === "toolbar") {
    return (
      <nav
        aria-label={t("appNav.landlordNavLabel")}
        className="flex max-w-full flex-wrap items-center justify-end gap-0.5 sm:gap-1"
      >
        <Link className={toolbarLinkClass} href={dashboardPath}>
          {t("appNav.checks")}
        </Link>
        <Link className={toolbarLinkClass} href={accountPath}>
          {t("appNav.account")}
        </Link>
        <form action={signOutAction} className="inline-flex">
          <button className={toolbarLinkClass} type="submit">
            {t("dashboard.signOut")}
          </button>
        </form>
      </nav>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <Link className="secondary-action min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0" href={dashboardPath}>
          {t("appNav.checks")}
        </Link>
        <Link className="secondary-action min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0" href={accountPath}>
          {t("appNav.account")}
        </Link>
        <form action={signOutAction} className="w-full sm:w-auto">
          <button
            className="secondary-action min-h-12 w-full rounded-[18px] px-5 py-3 text-sm font-semibold sm:min-h-0 sm:w-auto"
            type="submit"
          >
            {t("dashboard.signOut")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
      <Link className="secondary-action min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0" href={signInPath}>
        {t("nav.signIn")}
      </Link>
      <Link className="primary-action cta-breathe min-h-12 rounded-[18px] px-5 py-3 sm:min-h-0" href={startCheckPath}>
        {t("nav.startScreening")}
      </Link>
    </div>
  );
}
