"use client";

import type { DashboardStats, DashboardTier } from "@/lib/dashboard-tier";
import { useT } from "@/lib/i18n/context";

export function DashboardActivitySummary({ stats, tier }: { stats: DashboardStats; tier: DashboardTier }) {
  const t = useT();

  const activityCount =
    stats.awaitingUpload + stats.inReview + stats.reportsReady + (tier === "premium" ? stats.activeOperational : 0);

  if (stats.total === 0 || activityCount === 0) {
    return null;
  }

  const tiles =
    tier === "premium"
      ? [
          { label: t("dashboard.summaryActive"), value: stats.activeOperational },
          { label: t("dashboard.summaryAwaiting"), value: stats.awaitingUpload },
          { label: t("dashboard.summaryReview"), value: stats.inReview },
          { label: t("dashboard.summaryReady"), value: stats.reportsReady },
        ]
      : [
          { label: t("dashboard.summaryAwaiting"), value: stats.awaitingUpload },
          { label: t("dashboard.summaryReview"), value: stats.inReview },
          { label: t("dashboard.summaryReady"), value: stats.reportsReady },
        ];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-slate-900">{t("dashboard.summaryTitle")}</p>
      <div
        className={
          tier === "premium"
            ? "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
            : "mt-3 grid grid-cols-3 gap-2"
        }
      >
        {tiles.map((tile) => (
          <div className="rounded-xl bg-slate-50 px-3 py-3 text-center" key={tile.label}>
            <p className="text-lg font-semibold tabular-nums text-slate-950">{tile.value}</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">{tile.label}</p>
          </div>
        ))}
      </div>
      {tier === "premium" && stats.limits ? (
        <p className="mt-3 text-xs text-slate-500">
          {t("dashboard.planUsageLabel")}: {stats.activeOperational}/{stats.limits.activeChecks} ·{" "}
          {stats.completedThisMonth}/{stats.limits.completedChecksPerMonth}
        </p>
      ) : null}
    </section>
  );
}
