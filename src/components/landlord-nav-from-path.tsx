"use client";

import { usePathname } from "next/navigation";
import type { LandlordNavKey } from "@/components/landlord-app-nav";
import { LandlordAuthChrome } from "@/components/landlord-auth-chrome";
import { stripLocaleFromPath } from "@/lib/i18n";

function resolveLandlordNavKey(pathname: string): LandlordNavKey {
  const path = stripLocaleFromPath(pathname);

  if (path.startsWith("/dashboard/billing")) {
    return "plans";
  }

  if (path.startsWith("/dashboard/account")) {
    return "account";
  }

  return "checks";
}

export function LandlordNavFromPath({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeNav = resolveLandlordNavKey(pathname ?? "/dashboard");

  return <LandlordAuthChrome activeNav={activeNav}>{children}</LandlordAuthChrome>;
}
