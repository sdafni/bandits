import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { shouldIncludeDemoCasesInWorkspace } from "@/lib/demo-data";

type CommandCheck = {
  id: string;
  status: "draft" | "pending_upload" | "documents_received" | "under_review" | "report_ready";
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
  isGreek = false,
  experience = "premium",
  planLabel,
  planUsage,
  subscriptionStatus,
  workspaceMode = "preview",
  stats,
}: {
  isFirstWorkspace?: boolean;
  isGreek?: boolean;
  experience?: "basic" | "pro" | "premium";
  workspaceMode?: "preview" | "subscribed";
  checks: CommandCheck[];
  planLabel: string;
  planUsage: string;
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
  const recentActivity = [...checks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const actionCount = stats.pendingReview + stats.awaitingUpload;
  const isBasic = experience === "basic";
  const isPro = experience === "pro";
  return (
    <section className="command-shell">
      <div className="command-shell__bar">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[11px]">
            {isBasic ? (isGreek ? "Ο χώρος σου" : "Your workspace") : isGreek ? "Ζωντανός χώρος εργασίας" : "Live workspace"}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-lg">
            {isBasic ? (isGreek ? "Απλή διαχείριση ενοικιαστή" : "Simple tenant checks") : isGreek ? "Λειτουργίες ελέγχου" : "Tenant check operations"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-200 sm:text-xs">
            {workspaceMode === "preview"
              ? isGreek
                ? "Προεπισκόπηση χώρου εργασίας. Οι ενεργοποιήσεις γίνονται στο σημείο αποστολής συνδέσμου ή αναφοράς."
                : "Workspace preview. Activation happens when you send the upload link or open your SafeKey Report."
              : isFirstWorkspace
                ? isGreek
                  ? "Οργάνωσε την πρώτη σου υπόθεση ελέγχου ενοικιαστή."
                  : "Organize your first tenant check."
                : `${stats.active} ${isGreek ? "ενεργές" : "active"} · ${actionCount} ${isGreek ? "ενέργειες σε αναμονή" : `queued action${actionCount === 1 ? "" : "s"}`}${
                    stats.elevatedRisk > 0 ? ` · ${stats.elevatedRisk} ${isGreek ? "υψηλού κινδύνου" : "elevated risk"}` : ""
                  }`}
          </p>
        </div>
      </div>

      <div className="command-shell__body">
        <div className={isBasic ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4" : "responsive-metrics"}>
          {(isBasic
            ? [
                { hint: isGreek ? "Τρέχουσες υποθέσεις" : "Current checks", label: isGreek ? "Ενεργές υποθέσεις" : "Active checks", value: stats.active },
                { hint: isGreek ? "Αναμονή εγγράφων" : "Waiting on documents", label: isGreek ? "Αποστολές σε εκκρεμότητα" : "Upload status", value: stats.awaitingUpload },
                { hint: isGreek ? "Ολοκληρωμένες αναφορές" : "Completed decisions", label: isGreek ? "Έτοιμες συστάσεις" : "Recommendations ready", value: stats.readyForDecision },
                { hint: isGreek ? "Μέσο σκορ εμπιστοσύνης" : "Average trust score", label: isGreek ? "Μέσος δείκτης" : "Trust average", value: stats.averageScore ?? "—" },
              ]
            : [
                { hint: isGreek ? "Ανοικτές υποθέσεις" : "Open cases", label: isGreek ? "Ενεργό χαρτοφυλάκιο" : "Active portfolio", value: stats.active },
                {
                  alert: stats.pendingReview > 0,
                  hint: isGreek ? "Είσοδος αναλυτή" : "Analyst intake",
                  label: isGreek ? "Ουρά αξιολόγησης" : "Review queue",
                  value: stats.pendingReview,
                },
                {
                  alert: stats.awaitingUpload > 0,
                  hint: isGreek ? "Ενέργεια ενοικιαστή" : "Tenant action",
                  label: isGreek ? "Αναμονή αποστολής" : "Upload pending",
                  value: stats.awaitingUpload,
                },
                { hint: isGreek ? "Έτοιμο για απόφαση" : "Decision ready", label: isGreek ? "Έτοιμες αναφορές" : "Reports ready", value: stats.readyForDecision },
                {
                  alert: stats.elevatedRisk > 0,
                  hint: isGreek ? "Βαθμολογία κάτω από 60" : "Score below 60",
                  label: isGreek ? "Υψηλός κίνδυνος" : "Elevated risk",
                  value: stats.elevatedRisk,
                },
                { hint: isGreek ? "Ολοκληρωμένες υποθέσεις" : "Completed portfolio", label: isGreek ? "Μ.Ο. κινδύνου" : "Avg. risk score", value: stats.averageScore ?? "—" },
              ]).map((item) => (
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

        {!isBasic ? (
          <div className="grid gap-1.5 lg:grid-cols-3">
            <QueuePanel
              cases={reviewQueue}
              emptyLabel={isGreek ? "Δεν υπάρχουν υποθέσεις για αξιολόγηση." : "No cases awaiting analyst review."}
              title={isGreek ? "Ουρά αξιολόγησης" : "Review queue"}
            />
            <QueuePanel
              cases={uploadQueue}
              emptyLabel={isGreek ? "Δεν υπάρχουν υποθέσεις σε αναμονή αποστολής." : "No cases awaiting tenant upload."}
              title={isGreek ? "Ουρά αποστολών" : "Upload queue"}
            />
            <QueuePanel
              cases={decisionQueue}
              emptyLabel={isGreek ? "Δεν υπάρχουν αναφορές έτοιμες για απόφαση." : "No reports ready for landlord decision."}
              title={isGreek ? "Έτοιμο για απόφαση" : "Decision ready"}
            />
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              {isGreek ? "Πρόσφατη δραστηριότητα" : "Recent activity"}
            </p>
            <ul className="mt-2 space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((check) => (
                  <li key={check.id}>
                    <Link className="flex items-center justify-between gap-2 text-sm text-secondary hover:text-primary" href={`/dashboard/checks/${check.id}`}>
                      <span className="truncate">{check.tenant_full_name}</span>
                      <span className="text-xs text-muted">{humanize(check.status)}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">{isGreek ? "Δεν υπάρχει πρόσφατη δραστηριότητα ακόμα." : "No recent activity yet."}</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex flex-col items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <span className="text-secondary">
            {isGreek ? "Χρέωση" : "Billing"} ·{" "}
            <span className="font-semibold text-primary">
              {planLabel}
              {subscriptionStatus ? ` (${subscriptionStatus.replaceAll("_", " ")})` : ""}
            </span>
          </span>
          {!isBasic ? <span className="text-xs text-muted">{planUsage}</span> : null}
          <Link className="workspace-cta-secondary workspace-cta-secondary--compact" href="/dashboard/billing">
            {isPro ? (isGreek ? "Διαχείριση πλάνου" : "Manage plan") : isGreek ? "Διαχείριση χρέωσης" : "Manage billing"}
          </Link>
        </div>

        {shouldIncludeDemoCasesInWorkspace() ? (
          <p className="text-[10px] leading-4 text-slate-500">
            {isGreek ? "Δείγματα υποθέσεων διαθέσιμα για παρουσίαση." : "Sample cases are available for walkthroughs."}{" "}
            <Link className="font-medium text-slate-700 hover:underline" href="/demo">
              {isGreek ? "Οδηγός περιήγησης →" : "Guided tour →"}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
