import type { ReactNode } from "react";
import { LandlordNavFromPath } from "@/components/landlord-nav-from-path";
import { SessionIdleGuard } from "@/components/session-idle-guard";
import { requireLandlord } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireLandlord();

  return (
    <>
      <SessionIdleGuard />
      <LandlordNavFromPath>{children}</LandlordNavFromPath>
    </>
  );
}
