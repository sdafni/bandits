"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function DashboardProfileMenu({ billingNavEnabled = false }: { billingNavEnabled?: boolean }) {
  const { locale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("dashboard.profileMenu")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <UserRound className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <p className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
            <Menu className="h-3.5 w-3.5" />
            {t("dashboard.profileMenu")}
          </p>
          {billingNavEnabled ? (
            <Link
              className="block px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
              href={withLocalePath(locale, "/dashboard/billing")}
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              {t("dashboard.accountBilling")}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button
              className="block w-full px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              role="menuitem"
              type="submit"
            >
              {t("dashboard.signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
