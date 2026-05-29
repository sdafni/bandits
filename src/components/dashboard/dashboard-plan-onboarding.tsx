"use client";

import { DashboardPlanBanner } from "@/components/dashboard/dashboard-plan-banner";

/** @deprecated Use DashboardPlanBanner — kept for import compatibility. */
export function DashboardPlanOnboarding({ billingNavEnabled = false }: { billingNavEnabled?: boolean }) {
  return <DashboardPlanBanner billingNavEnabled={billingNavEnabled} />;
}
