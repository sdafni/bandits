import type { DashboardCheck, DashboardStats } from "@/lib/dashboard-tier";
import type { BillingPlanLimits } from "@/lib/billing";

export function buildDashboardStats(checks: DashboardCheck[], limits: BillingPlanLimits): DashboardStats {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  const awaitingUpload = checks.filter(
    (check) => check.status === "pending_upload" || check.status === "draft",
  ).length;
  const inReview = checks.filter(
    (check) => check.status === "documents_received" || check.status === "under_review",
  ).length;
  const reportsReady = checks.filter((check) => check.status === "report_ready").length;
  const activeOperational = checks.filter(
    (check) => check.status !== "report_ready" && check.status !== "draft",
  ).length;

  const completedChecks = checks.filter((check) => check.status === "report_ready");
  const scores = completedChecks
    .map((check) => check.ai_reports?.score)
    .filter((score): score is number => typeof score === "number");
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const elevatedRisk = completedChecks.filter((check) => (check.ai_reports?.score ?? 100) < 60).length;

  const completedThisMonth = checks.filter((check) => {
    if (check.status !== "report_ready") {
      return false;
    }
    const completedAt = check.review_completed_at ?? check.created_at;
    return new Date(completedAt).getTime() >= monthStartMs;
  }).length;

  return {
    activeOperational,
    awaitingUpload,
    averageScore,
    completedThisMonth,
    elevatedRisk,
    inReview,
    limits,
    reportsReady,
    total: checks.length,
  };
}
