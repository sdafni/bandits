import type { ReactNode } from "react";
import { SessionIdleGuard } from "@/components/session-idle-guard";
import { requireLandlord } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireLandlord();
  return (
    <>
      <SessionIdleGuard />
      {children}
    </>
  );
}
