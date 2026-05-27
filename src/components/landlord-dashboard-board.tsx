"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpDown, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/badge";
import { NewCheckForm } from "@/components/new-check-form";
import { WorkspaceState } from "@/components/workspace-state";
import { isDemoCheckId } from "@/lib/demo-data";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getOperationalState } from "@/lib/operations";

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
  documents_received: "neutral",
  under_review: "warning",
  report_ready: "success",
} as const;

const RECOMMENDATION_TONE = {
  approve: "success",
  conditional: "warning",
  decline: "danger",
} as const;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending_review", label: "Pending review" },
  { id: "completed", label: "Completed" },
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

function getRiskLabel(score: number | null) {
  if (score == null) {
    return { bar: "bg-slate-300", label: "Pending", text: "text-slate-500" };
  }
  if (score >= 80) {
    return { bar: "bg-emerald-500", label: "Low risk", text: "text-emerald-700" };
  }
  if (score >= 60) {
    return { bar: "bg-amber-500", label: "Moderate", text: "text-amber-700" };
  }
  return { bar: "bg-rose-500", label: "Elevated", text: "text-rose-700" };
}

export function LandlordDashboardBoard({ checks }: { checks: DashboardCheck[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [sortBy, setSortBy] = useState<SortId>("recent");
  const [searchQuery, setSearchQuery] = useState("");

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
    <div className="space-y-4">
      <details className="workspace-disclosure group" open={checks.length === 0}>
        <summary className="workspace-disclosure__summary">
          <div>
            <p className="text-sm font-semibold text-slate-950">Create new screening</p>
            <p className="text-xs text-slate-600">Open a tenant case and issue the secure upload link.</p>
          </div>
          <span className="workspace-disclosure__chevron">
            <ChevronDown className="h-4 w-4" />
          </span>
        </summary>
        <div className="workspace-disclosure__content">
          <NewCheckForm />
        </div>
      </details>

      <section className="workspace-card space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Operations</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">Tenant cases</h2>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative min-w-0 sm:min-w-[240px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input min-h-11 py-3 pl-10 text-sm"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tenant or property"
                type="search"
                value={searchQuery}
              />
            </label>
            <label className="relative min-w-0 sm:min-w-[200px]">
              <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="input min-h-11 appearance-none py-3 pl-10 text-sm"
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
              className={cn("filter-chip", activeFilter === filter.id && "filter-chip--active")}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 opacity-70" />
              {filter.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filteredChecks.length}</span> of{" "}
          <span className="font-semibold text-slate-900">{checks.length}</span> cases
        </p>

        {checks.length === 0 ? (
          <WorkspaceState
            actionHref="#create"
            actionLabel="Create screening above"
            description="Use the form above to open your first tenant case and share the upload link."
            title="No tenant cases yet"
            variant="empty"
          />
        ) : filteredChecks.length === 0 ? (
          <WorkspaceState
            description="Try a broader search or reset filters."
            title="No cases match your filters"
            variant="filter"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredChecks.map((check) => {
              const state = getOperationalState(check.status);
              const uploadedCount = check.tenant_documents.length;
              const requestedCount = Math.max(check.requested_documents.length, 1);
              const uploadProgress = getUploadProgress(uploadedCount, requestedCount);
              const recommendation = check.ai_reports?.recommendation ?? null;
              const riskScore = check.ai_reports?.score ?? null;
              const risk = getRiskLabel(riskScore);

              return (
                <Link
                  className="workspace-case-card group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 transition duration-200"
                  href={`/dashboard/checks/${check.id}`}
                  key={check.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-base font-semibold text-slate-950">{check.tenant_full_name}</h3>
                        {isDemoCheckId(check.id) ? (
                          <Badge tone="neutral">Demo</Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-slate-600">
                        {check.properties?.name ?? "Property"} · {check.properties?.city ?? "Greece"}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-medium text-slate-500">{formatCurrency(check.properties?.monthly_rent)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={STATUS_TONE[check.status]}>{humanize(check.status)}</Badge>
                    {recommendation ? (
                      <Badge tone={RECOMMENDATION_TONE[recommendation]}>{humanize(recommendation)}</Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Risk</p>
                      <p className={cn("mt-0.5 text-sm font-semibold", risk.text)}>
                        {riskScore == null ? "—" : riskScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Upload</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{uploadProgress}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Stage</p>
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-4 text-slate-800">{state.humanState}</p>
                    </div>
                  </div>

                  {check.ai_reports?.summary ? (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{check.ai_reports.summary}</p>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-slate-500">{state.nextStep}</p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-slate-500">Opened {formatDate(check.created_at)}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                      Open case
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>

                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-500", risk.bar)}
                      style={{ width: `${riskScore ?? uploadProgress}%` }}
                    />
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
