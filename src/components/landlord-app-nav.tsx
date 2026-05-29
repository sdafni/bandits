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
      className={cn("landlord-bottom-nav fixed inset-x-0 bottom-0 z-40 sm:static sm:z-auto", className)}
    >
      <div className="landlord-bottom-nav__tabs mx-auto max-w-lg sm:flex sm:max-w-none sm:justify-start sm:gap-2 sm:px-0">
        {items.map(({ key, href, label, icon: Icon }) => {
          const isActive = active === key;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "landlord-bottom-nav__tab",
                "sm:inline-flex sm:min-h-10 sm:items-center sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm sm:font-semibold sm:transition",
                isActive
                  ? "sm:bg-[#0f2343] sm:text-white"
                  : "sm:border sm:border-slate-200 sm:bg-white sm:text-slate-700 sm:hover:border-slate-300 sm:hover:bg-slate-50",
              )}
              href={href}
              key={key}
            >
              <span
                className={cn(
                  "landlord-bottom-nav__pill",
                  isActive ? "landlord-bottom-nav__pill--active" : "text-slate-600",
                  "sm:inline-flex sm:min-h-0 sm:flex-row sm:gap-2 sm:bg-transparent sm:p-0 sm:text-inherit",
                )}
              >
                <Icon
                  className="h-[1.125rem] w-[1.125rem] shrink-0 sm:h-4 sm:w-4"
                  aria-hidden
                />
                <span className="landlord-bottom-nav__label">{label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
