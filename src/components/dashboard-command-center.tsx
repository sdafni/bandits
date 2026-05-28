import Link from "next/link";
import { AlertTriangle, ArrowRight, CreditCard, Plus } from "lucide-react";
import { shouldIncludeDemoCasesInWorkspace } from "@/lib/demo-data";

type CommandCheck = {
  id: string;
  status: "pending_upload" | "documents_received" | "under_review" | "report_ready";
  created_at: string;
  review_completed_at: string | null;
  review_requested_at: string | null;
  tenant_full_name: string;
  properties: { name: string; city: string | null } | null;
  ai_reports: { recommendation: "approve" | "conditional" | "decline"; score: number; summary: string } | null;
  tenant_documents: Array<{ id: string }>;
};

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function QueuePanel({
  cases,
  emptyLabel,
  title,
}: {
  cases: CommandCheck[];
  emptyLabel: string;
  title: string;
}) {
  return (
    <div className="ops-panel h-full">
      <div className="ops-panel__head">
        <p className="ops-panel__title">{title}</p>
        <span className="ops-panel__count">{cases.length}</span>
      </div>
      <div className="ops-panel__body">
        {cases.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-500">{emptyLabel}</p>
        ) : (
          <ul>
            {cases.map((check) => (
              <li key={check.id}>
                <Link className="ops-queue-row" href={`/dashboard/checks/${check.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-900">{check.tenant_full_name}</p>
                    <p className="truncate text-[10px] text-slate-500">
                      {check.properties?.name ?? "Property"} · {humanize(check.status)}
                    </p>
                  </div>
                  {check.ai_reports?.score != null ? (
                    <span className="text-xs font-semibold tabular-nums text-slate-700">{check.ai_reports.score}</span>
                  ) : null}
                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function DashboardCommandCenter({
  checks,
  isFirstWorkspace = false,
  planLabel,
  subscriptionStatus,
  stats,
}: {
  isFirstWorkspace?: boolean;
  checks: CommandCheck[];
  planLabel: string;
  subscriptionStatus: string | null;
  stats: {
    active: number;
    awaitingUpload: number;
    averageScore: number | null;
    completed: number;
    pendingReview: number;
    elevatedRisk: number;
    readyForDecision: number;
  };
}) {
  const reviewQueue = checks.filter(
    (check) => check.status === "documents_received" || check.status === "under_review",
  );
  const uploadQueue = checks.filter((check) => check.status === "pending_upload");
  const decisionQueue = checks
    .filter((check) => check.status === "report_ready")
    .slice(0, 4);

  const actionCount = stats.pendingReview + stats.awaitingUpload;
  return (
    <section className="command-shell">
      <div className="command-shell__bar">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[11px]">Live workspace</p>
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-lg">Screening operations</h2>
          <p className="mt-0.5 text-sm text-slate-200 sm:text-xs">
            {isFirstWorkspace
              ? "Create your first case, share the upload link, and receive a trust report."
              : `${stats.active} active · ${actionCount} queued action${actionCount === 1 ? "" : "s"}${
                  stats.elevatedRisk > 0 ? ` · ${stats.elevatedRisk} elevated risk` : ""
                }`}
          </p>
        </div>
        <div className="command-shell__actions shrink-0">
          <a className="workspace-cta workspace-cta--compact" href={isFirstWorkspace ? "#new-screening" : "#tenant-cases"}>
            <Plus className="h-3.5 w-3.5" />
            New screening
          </a>
          <Link className="workspace-cta-secondary workspace-cta-secondary--compact border-slate-600 bg-slate-800 text-white hover:bg-slate-700" href="/dashboard/billing">
            <CreditCard className="h-3.5 w-3.5" />
            Billing
          </Link>
        </div>
      </div>

      <div className="command-shell__body">
        <div className="responsive-metrics">
          {[
            { hint: "Open cases", label: "Active portfolio", value: stats.active },
            {
              alert: stats.pendingReview > 0,
              hint: "Analyst intake",
              label: "Review queue",
              value: stats.pendingReview,
            },
            {
              alert: stats.awaitingUpload > 0,
              hint: "Tenant action",
              label: "Upload pending",
              value: stats.awaitingUpload,
            },
            { hint: "Decision ready", label: "Reports ready", value: stats.readyForDecision },
            {
              alert: stats.elevatedRisk > 0,
              hint: "Score below 60",
              label: "Elevated risk",
              value: stats.elevatedRisk,
            },
            { hint: "Completed portfolio", label: "Avg. risk score", value: stats.averageScore ?? "—" },
          ].map((item) => (
            <div className={item.alert ? "ops-kpi ops-kpi--alert" : "ops-kpi"} key={item.label}>
              <p className="ops-kpi__label">{item.label}</p>
              <p className="ops-kpi__value">
                {item.value}
                {item.alert ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : null}
              </p>
              <p className="ops-kpi__hint">{item.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-1.5 lg:grid-cols-3">
          <QueuePanel cases={reviewQueue} emptyLabel="No cases awaiting analyst review." title="Review queue" />
          <QueuePanel cases={uploadQueue} emptyLabel="No cases awaiting tenant upload." title="Upload queue" />
          <QueuePanel cases={decisionQueue} emptyLabel="No reports ready for landlord decision." title="Decision ready" />
        </div>

        <div className="flex flex-col items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <span className="text-secondary">
            Billing ·{" "}
            <span className="font-semibold text-primary">
              {planLabel}
              {subscriptionStatus ? ` (${subscriptionStatus.replaceAll("_", " ")})` : ""}
            </span>
          </span>
          <Link className="workspace-cta-secondary workspace-cta-secondary--compact" href="/dashboard/billing">
            Manage billing
          </Link>
        </div>

        {shouldIncludeDemoCasesInWorkspace() ? (
          <p className="text-[10px] leading-4 text-slate-500">
            Sample cases are available for walkthroughs.{" "}
            <Link className="font-medium text-slate-700 hover:underline" href="/demo">
              Guided tour →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
