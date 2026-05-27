import Link from "next/link";
import { AlertCircle, ArrowRight, Clock3, CreditCard, Plus, Upload } from "lucide-react";
import { getBillingPlanName } from "@/lib/billing";
import { isDemoCheckId } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";
import { getOperationalState } from "@/lib/operations";

type CommandCheck = {
  id: string;
  status: "pending_upload" | "documents_received" | "under_review" | "report_ready";
  created_at: string;
  review_completed_at: string | null;
  review_requested_at: string | null;
  tenant_full_name: string;
  properties: { name: string; city: string | null } | null;
  ai_reports: { summary: string } | null;
  tenant_documents: Array<{ id: string }>;
};

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function getRecentActivity(checks: CommandCheck[]) {
  return checks
    .map((check) => {
      const eventDate = check.review_completed_at ?? check.review_requested_at ?? check.created_at;
      const uploadedCount = check.tenant_documents.length;

      return {
        date: eventDate,
        detail:
          check.status === "pending_upload"
            ? "Upload link issued"
            : uploadedCount > 0 && !check.ai_reports
              ? `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} received`
              : check.ai_reports?.summary?.slice(0, 72) ?? getOperationalState(check.status).analystState,
        href: `/dashboard/checks/${check.id}`,
        label:
          check.status === "report_ready"
            ? "Report ready"
            : check.status === "under_review"
              ? "Under review"
              : check.status === "documents_received"
                ? "Docs received"
                : "Awaiting upload",
        tenantName: check.tenant_full_name,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

export function DashboardCommandCenter({
  checks,
  firstName,
  planLabel,
  hasBillingPlan,
  subscriptionStatus,
  stats,
}: {
  checks: CommandCheck[];
  firstName: string;
  hasBillingPlan: boolean;
  planLabel: string;
  subscriptionStatus: string | null;
  stats: {
    active: number;
    awaitingUpload: number;
    averageScore: number | null;
    completed: number;
    pendingReview: number;
  };
}) {
  const urgentCases = checks
    .filter(
      (check) =>
        check.status === "pending_upload" ||
        check.status === "documents_received" ||
        check.status === "under_review",
    )
    .slice(0, 4);

  const recentActivity = getRecentActivity(checks);
  const hasDemoCases = checks.some((check) => isDemoCheckId(check.id));

  return (
    <section className="workspace-card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="section-label">Command center</p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Welcome back, {firstName}
          </h2>
          <p className="text-sm text-slate-600">
            {stats.pendingReview > 0
              ? `${stats.pendingReview} case${stats.pendingReview === 1 ? "" : "s"} need review.`
              : stats.awaitingUpload > 0
                ? `${stats.awaitingUpload} awaiting tenant upload.`
                : "Operational overview for your screening workspace."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a className="workspace-cta" href="#tenant-cases">
            <Plus className="h-4 w-4" />
            New screening
          </a>
          <Link className="workspace-cta-secondary" href="/dashboard/billing">
            <CreditCard className="h-4 w-4" />
            Billing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "Active", value: stats.active },
          { label: "Pending review", value: stats.pendingReview, alert: stats.pendingReview > 0 },
          { label: "Awaiting upload", value: stats.awaitingUpload, alert: stats.awaitingUpload > 0 },
          { label: "Reports ready", value: stats.completed },
          { label: "Avg. score", value: stats.averageScore ?? "—" },
        ].map((item) => (
          <div className="metric-tile" key={item.label}>
            <p className="metric-tile__label">{item.label}</p>
            <p className="metric-tile__value">
              {item.value}
              {item.alert ? <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> : null}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs attention</p>
            {urgentCases.length > 0 ? (
              <span className="text-xs font-medium text-slate-600">{urgentCases.length} open</span>
            ) : null}
          </div>
          {urgentCases.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No urgent actions. All cases are progressing normally.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {urgentCases.map((check) => (
                <li key={check.id}>
                  <Link
                    className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-2 transition hover:border-slate-200 hover:bg-white"
                    href={`/dashboard/checks/${check.id}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{check.tenant_full_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {humanize(check.status)} · {check.properties?.name ?? "Property"}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent activity</p>
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
          </div>
          {recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Activity appears once your first case is created.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {recentActivity.map((item) => (
                <li key={item.href}>
                  <Link
                    className="block rounded-lg border border-transparent px-2 py-2 transition hover:border-slate-200 hover:bg-white"
                    href={item.href}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{item.tenantName}</p>
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {item.detail} · {formatDate(item.date)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Upload className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">Billing:</span>
          <span className="font-semibold text-slate-900">
            {hasBillingPlan ? planLabel : "No subscription"}
            {subscriptionStatus ? ` · ${subscriptionStatus.replaceAll("_", " ")}` : ""}
          </span>
        </div>
        <Link className="workspace-cta-secondary w-full sm:w-auto" href="/dashboard/billing">
          Manage billing
        </Link>
      </div>

      {hasDemoCases ? (
        <p className="text-xs leading-5 text-slate-500">
          Cases marked <span className="font-medium text-slate-700">Demo</span> are presentation samples.{" "}
          <Link className="font-medium text-slate-800 underline-offset-2 hover:underline" href="/demo">
            Open investor walkthrough →
          </Link>
        </p>
      ) : null}
    </section>
  );
}
