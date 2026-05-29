"use client";

import Link from "next/link";
import { ClipboardList, CreditCard, UserRound } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type LandlordNavKey = "checks" | "plans" | "account";

export function LandlordAppNav({
  active,
  className,
  variant = "bar",
}: {
  active: LandlordNavKey;
  className?: string;
  variant?: "bar" | "compact";
}) {
  const { locale } = useLocale();
  const t = useT();

  const items: Array<{
    key: LandlordNavKey;
    href: string;
    label: string;
    icon: typeof ClipboardList;
  }> = [
    {
      key: "checks",
      href: withLocalePath(locale, "/dashboard"),
      label: t("appNav.checks"),
      icon: ClipboardList,
    },
    {
      key: "plans",
      href: withLocalePath(locale, "/dashboard/billing"),
      label: t("appNav.billing"),
      icon: CreditCard,
    },
    {
      key: "account",
      href: withLocalePath(locale, "/dashboard/account"),
      label: t("appNav.account"),
      icon: UserRound,
    },
  ];

  if (variant === "compact") {
    return (
      <nav aria-label={t("appNav.landlordNavLabel")} className={cn("flex flex-wrap gap-2", className)}>
        {items.map(({ key, href, label, icon: Icon }) => (
          <Link
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
              active === key
                ? "bg-[#0f2343] text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
            )}
            href={href}
            key={key}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label={t("appNav.landlordNavLabel")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:pb-0 sm:pt-0",
        className,
      )}
    >
      <div className="mx-auto grid max-w-lg grid-cols-3 gap-1 px-2 sm:flex sm:max-w-none sm:justify-start sm:gap-2 sm:px-0">
        {items.map(({ key, href, label, icon: Icon }) => (
          <Link
            className={cn(
              "flex min-h-[3.5rem] min-w-0 flex-col items-center justify-center gap-1 overflow-visible rounded-xl px-1.5 py-2 text-center text-[11px] font-semibold leading-snug transition sm:min-h-10 sm:min-w-0 sm:flex-row sm:flex-none sm:gap-2 sm:px-4 sm:py-2 sm:text-left sm:text-sm",
              active === key
                ? "bg-[#0f2343] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
            href={href}
            key={key}
          >
            <Icon className="h-[1.125rem] w-[1.125rem] shrink-0 sm:h-4 sm:w-4" aria-hidden />
            <span className="block w-full max-w-full px-0.5">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
