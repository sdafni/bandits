"use client";

import { useMemo, useState } from "react";
import type { DashboardCheck, DashboardStats, DashboardTier } from "@/lib/dashboard-tier";
import { DASHBOARD_TIER_FEATURES } from "@/lib/dashboard-tier";
import { DashboardActivitySummary } from "@/components/dashboard/dashboard-activity-summary";
import { DashboardAttentionList } from "@/components/dashboard/dashboard-attention-list";
import { DashboardCheckList } from "@/components/dashboard/dashboard-check-list";
import { DashboardToast } from "@/components/dashboard-toast";
import { readDismissedDemoCaseIds } from "@/lib/dismissed-demo-cases";

export function DashboardTierView({
  checks,
  stats,
  tier,
}: {
  checks: DashboardCheck[];
  stats: DashboardStats;
  tier: DashboardTier;
}) {
  const features = DASHBOARD_TIER_FEATURES[tier];
  const [dismissedDemoIds, setDismissedDemoIds] = useState<string[]>(() => readDismissedDemoCaseIds());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const visibleChecks = useMemo(
    () => checks.filter((check) => !dismissedDemoIds.includes(check.id)),
    [checks, dismissedDemoIds],
  );

  function handleCheckRemoved(message: string) {
    setDismissedDemoIds(readDismissedDemoCaseIds());
    setToastMessage(message);
  }

  return (
    <div className="space-y-5">
      {features.showActivitySummary && stats.total > 0 ? (
        <DashboardActivitySummary stats={stats} tier={tier} />
      ) : null}
      {features.showAttentionList ? <DashboardAttentionList checks={visibleChecks} /> : null}
      <DashboardCheckList checks={visibleChecks} onCheckRemoved={handleCheckRemoved} tier={tier} />
      {toastMessage ? <DashboardToast message={toastMessage} onDismiss={() => setToastMessage(null)} /> : null}
    </div>
  );
}
