"use client";

import type { LandlordNavKey } from "@/components/landlord-app-nav";
import { LandlordAppNav } from "@/components/landlord-app-nav";

export function LandlordAuthChrome({
  activeNav,
  children,
}: {
  activeNav: LandlordNavKey;
  children: React.ReactNode;
}) {
  return (
    <div className="landlord-auth-chrome flex min-h-screen flex-col">
      <div className="flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</div>
      <LandlordAppNav active={activeNav} />
    </div>
  );
}
