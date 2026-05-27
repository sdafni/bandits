"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCheck,
  CircleDashed,
  Clock3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { NewCheckForm } from "@/components/new-check-form";
import { WorkspaceState } from "@/components/workspace-state";
import { isDemoCheckId } from "@/lib/demo-data";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getOperationalState, getOperationalTimestamp, getVerificationChecklist } from "@/lib/operations";

type DashboardCheck = {
  id: string;
  status: "pending_upload" | "documents_received" | "under_review" | "report_ready";
  created_at: string;
  review_requested_at: string | null;
  review_completed_at: string | null;
  requested_documents: string[];
  tenant_full_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  properties: {
    city: string | null;
    monthly_rent: number | null;
    name: string;
  } | null;
  ai_reports: {
    created_at: string;
    recommendation: "approve" | "conditional" | "decline";
    score: number;
    summary: string;
  } | null;
  tenant_documents: Array<{ id: string }>;
};

const STATUS_TONE = {
  pending_upload: "warning",
  documents_received: "info",
  under_review: "info",
  report_ready: "success",
} as const;

const RECOMMENDATION_TONE = {
  approve: "success",
  conditional: "warning",
  decline: "danger",
} as const;

const FILTERS = [
  { id: "all", label: "All cases" },
  { id: "pending_review", label: "Pending reviews" },
  { id: "completed", label: "Completed screenings" },
  { id: "awaiting_upload", label: "Awaiting upload" },
] as const;

const SORT_OPTIONS = [
  { id: "recent", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "score_desc", label: "Highest score" },
  { id: "score_asc", label: "Highest risk" },
  { id: "progress_desc", label: "Upload progress" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
type SortId = (typeof SORT_OPTIONS)[number]["id"];

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function getUploadProgress(uploadedCount: number, requestedCount: number) {
  if (requestedCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((uploadedCount / requestedCount) * 100));
}

function getRiskMeterTone(score: number | null) {
  if (score == null) {
    return {
      bar: "bg-slate-300",
      label: "Pending",
      text: "text-slate-500",
      track: "bg-slate-100",
    };
  }

  if (score >= 80) {
    return {
      bar: "bg-emerald-500",
      label: "Low risk",
      text: "text-emerald-700",
      track: "bg-emerald-50",
    };
  }

  if (score >= 60) {
    return {
      bar: "bg-amber-500",
      label: "Moderate risk",
      text: "text-amber-700",
      track: "bg-amber-50",
    };
  }

  return {
    bar: "bg-rose-500",
    label: "Elevated risk",
    text: "text-rose-700",
    track: "bg-rose-50",
  };
}

function getActivityItems(checks: DashboardCheck[]) {
  return checks
    .map((check) => {
      const eventDate = check.review_completed_at ?? check.review_requested_at ?? check.created_at;
      const uploadedCount = check.tenant_documents.length;
      const summary = check.ai_reports?.summary ?? getOperationalState(check.status).analystState;

      return {
        id: check.id,
        date: eventDate,
        detail:
          check.status === "pending_upload"
            ? "Secure upload link issued and ready for applicant sharing."
            : uploadedCount > 0 && !check.ai_reports
              ? `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} received and ready for analyst intake.`
              : summary,
        label:
          check.status === "report_ready"
            ? "Screening completed"
            : check.status === "under_review"
              ? "Review in progress"
              : check.status === "documents_received"
                ? "Documents received"
                : "Case opened",
        tenantName: check.tenant_full_name,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);
}

export function LandlordDashboardBoard({ checks }: { checks: DashboardCheck[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [sortBy, setSortBy] = useState<SortId>("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const pendingReviewCount = checks.filter(
    (check) => check.status === "documents_received" || check.status === "under_review",
  ).length;
  const completedCount = checks.filter((check) => check.status === "report_ready").length;
  const awaitingUploadCount = checks.filter((check) => check.status === "pending_upload").length;
  const averageUploadProgress =
    checks.length > 0
      ? Math.round(
          checks.reduce((total, check) => {
            return (
              total + getUploadProgress(check.tenant_documents.length, Math.max(check.requested_documents.length, 1))
            );
          }, 0) / checks.length,
        )
      : 0;

  const recentActivity = useMemo(() => getActivityItems(checks), [checks]);

  const filteredChecks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let result = checks.filter((check) => {
      if (activeFilter === "pending_review") {
        if (!(check.status === "documents_received" || check.status === "under_review")) {
          return false;
        }
      }

      if (activeFilter === "completed" && check.status !== "report_ready") {
        return false;
      }

      if (activeFilter === "awaiting_upload" && check.status !== "pending_upload") {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        check.tenant_full_name,
        check.tenant_email ?? "",
        check.properties?.name ?? "",
        check.properties?.city ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    result = [...result].sort((left, right) => {
      if (sortBy === "oldest") {
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }

      if (sortBy === "score_desc") {
        return (right.ai_reports?.score ?? -1) - (left.ai_reports?.score ?? -1);
      }

      if (sortBy === "score_asc") {
        return (left.ai_reports?.score ?? Number.POSITIVE_INFINITY) - (right.ai_reports?.score ?? Number.POSITIVE_INFINITY);
      }

      if (sortBy === "progress_desc") {
        return (
          getUploadProgress(right.tenant_documents.length, Math.max(right.requested_documents.length, 1)) -
          getUploadProgress(left.tenant_documents.length, Math.max(left.requested_documents.length, 1))
        );
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });

    return result;
  }, [activeFilter, checks, searchQuery, sortBy]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="card space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Create tenant flow</p>
            <h2 className="text-2xl font-semibold text-slate-950">Open a new tenant check</h2>
            <p className="text-sm leading-7 text-slate-600">
              Create a case, request the right documents, and issue the secure upload link instantly from one operational workspace.
            </p>
          </div>
          <NewCheckForm />
        </div>

        <div className="card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Operational pulse</p>
              <h2 className="text-2xl font-semibold text-slate-950">Case load, review pressure, and recent activity</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe2eb] bg-[#f7f9fc] px-3 py-1.5 text-xs font-medium text-[#42526b]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#183454]" />
              Live landlord operations
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              hint="Cases waiting for analyst action"
              icon={<Clock3 className="h-4 w-4 text-[#183454]" />}
              label="Pending reviews"
              value={String(pendingReviewCount)}
            />
            <SummaryTile
              hint="Screenings ready for landlord review"
              icon={<CheckCheck className="h-4 w-4 text-emerald-600" />}
              label="Completed screenings"
              value={String(completedCount)}
            />
            <SummaryTile
              hint="Applicants who still need to upload"
              icon={<Upload className="h-4 w-4 text-[#8b6b17]" />}
              label="Awaiting upload"
              value={String(awaitingUploadCount)}
            />
            <SummaryTile
              hint="Average requested file completion"
              icon={<CircleDashed className="h-4 w-4 text-[#0f2343]" />}
              label="Upload progress"
              value={`${averageUploadProgress}%`}
            />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5a6980]">Activity timeline</p>
                <h3 className="mt-1 text-lg font-semibold text-[#0f2343]">Latest case movement across the dashboard</h3>
              </div>
              <Badge tone="info">{recentActivity.length} updates</Badge>
            </div>

            <div className="mt-5 space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm leading-7 text-slate-600">
                  Activity will appear here once the first tenant case is opened.
                </p>
              ) : (
                recentActivity.map((item, index) => (
                  <div className="flex gap-4" key={item.id}>
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-3 w-3 rounded-full bg-[#0f2343]" />
                      {index < recentActivity.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                    </div>
                    <div className="min-w-0 space-y-1 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#5a6980]">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#0f2343]">{item.tenantName}</p>
                      <p className="text-sm leading-7 text-slate-700">{item.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Tenant case board</p>
            <h2 className="text-2xl font-semibold text-slate-950">Operational case cards for the full screening pipeline</h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              Filter, sort, and review live cases by upload readiness, risk, recommendation, and overall screening status.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-11"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by tenant or property"
                type="search"
                value={searchQuery}
              />
            </label>

            <label className="relative min-w-[220px]">
              <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="input appearance-none pl-11"
                onChange={(event) => setSortBy(event.target.value as SortId)}
                value={sortBy}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition",
                activeFilter === filter.id
                  ? "border-[#0f2343] bg-[#0f2343] text-white shadow-[0_10px_22px_rgba(15,35,67,0.14)]"
                  : "border-slate-200 bg-white text-[#42526b] hover:border-slate-300 hover:bg-slate-50 hover:text-[#0f2343]",
              )}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
            >
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-[#0f2343]">{filteredChecks.length}</span> of{" "}
            <span className="font-semibold text-[#0f2343]">{checks.length}</span> active case
            {checks.length === 1 ? "" : "s"}.
          </p>
          <div className="text-sm font-medium text-[#42526b]">
            {activeFilter === "all" ? "All landlord cases" : humanize(activeFilter)}
          </div>
        </div>

        {checks.length === 0 ? (
          <WorkspaceState
            actionHref="/dashboard"
            actionLabel="Create your first tenant check"
            description="Open a tenant check above to issue a secure upload link and start the screening workflow."
            title="No tenant cases yet"
            variant="empty"
          />
        ) : filteredChecks.length === 0 ? (
          <WorkspaceState
            description="Try a broader search or switch back to all cases to see the full portfolio."
            title="No cases match the current filters"
            variant="filter"
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredChecks.map((check) => {
              const state = getOperationalState(check.status);
              const uploadedCount = check.tenant_documents.length;
              const requestedCount = Math.max(check.requested_documents.length, 1);
              const uploadProgress = getUploadProgress(uploadedCount, requestedCount);
              const recommendation = check.ai_reports?.recommendation ?? null;
              const riskScore = check.ai_reports?.score ?? null;
              const riskTone = getRiskMeterTone(riskScore);

              return (
                <Link
                  className="group block rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_22px_rgba(15,35,67,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_34px_rgba(15,35,67,0.08)]"
                  href={`/dashboard/checks/${check.id}`}
                  key={check.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">{check.tenant_full_name}</h3>
                        {isDemoCheckId(check.id) ? <Badge tone="info">Demo</Badge> : null}
                        <Badge tone={STATUS_TONE[check.status]}>{humanize(check.status)}</Badge>
                        {recommendation ? (
                          <Badge tone={RECOMMENDATION_TONE[recommendation]}>{humanize(recommendation)}</Badge>
                        ) : (
                          <Badge tone="neutral">Pending recommendation</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {check.properties?.name ?? "Property"} • {check.properties?.city ?? "Greece"} • Opened{" "}
                        {formatDate(check.created_at)}
                      </p>
                    </div>

                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#42526b]">
                      {formatCurrency(check.properties?.monthly_rent)} rent
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Current stage" value={state.humanState} />
                    <MetricTile label="Pending reviews" value={state.nextStep} />
                    <MetricTile
                      label="Upload progress"
                      value={`${uploadedCount}/${requestedCount}`}
                      subValue={`${uploadProgress}% complete`}
                    />
                    <MetricTile
                      label="Recommendation"
                      value={recommendation ? humanize(recommendation) : "Pending review"}
                      subValue={getOperationalTimestamp(check)}
                    />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">
                          Risk score
                        </p>
                        <span className={cn("text-xs font-semibold uppercase tracking-[0.12em]", riskTone.text)}>
                          {riskTone.label}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-4">
                        <p className="text-3xl font-semibold tracking-[-0.04em] text-[#0f2343]">
                          {riskScore == null ? "--" : riskScore}
                        </p>
                        <p className="text-sm text-slate-500">{riskScore == null ? "Awaiting report" : "out of 100"}</p>
                      </div>
                      <div className={cn("mt-4 h-2 overflow-hidden rounded-full", riskTone.track)}>
                        <div
                          className={cn("h-full rounded-full transition-[width] duration-500", riskTone.bar)}
                          style={{ width: `${riskScore ?? 12}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">
                          Upload progress
                        </p>
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#42526b]">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#0f2343] transition-[width] duration-500"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        {check.status === "pending_upload"
                          ? "Secure upload link ready for tenant sharing."
                          : uploadedCount > 0
                            ? `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} received and visible in the workspace.`
                            : "Waiting for the first tenant upload."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">
                      Recommendation summary
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {check.ai_reports?.summary ??
                        "Once the review is ready, SafeKey will summarize the risk outcome, missing documents, and next recommended action here."}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-start gap-4">
                    <div className="flex-1 rounded-[24px] border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Requested checks</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getVerificationChecklist(check.requested_documents).map((item) => (
                          <span
                            className="rounded-full border border-[#dbe2eb] bg-[#fbfcfe] px-3 py-1.5 text-xs font-medium text-[#42526b]"
                            key={item}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-[180px] rounded-[24px] border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Open case</p>
                      <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0f2343]">
                        Review full file
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#0f2343]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#0f2343]">{value}</p>
      {subValue ? <p className="mt-1 text-xs leading-6 text-slate-500">{subValue}</p> : null}
    </div>
  );
}
