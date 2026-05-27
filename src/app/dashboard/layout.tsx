import type { ReactNode } from "react";
import { requireLandlord } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireLandlord();
  return children;
}
