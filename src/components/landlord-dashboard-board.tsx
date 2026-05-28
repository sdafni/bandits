"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/badge";
import { NewCheckForm } from "@/components/new-check-form";
import { RiskChip } from "@/components/risk-chip";
import { WorkspaceState } from "@/components/workspace-state";
import { CaseOriginBadge } from "@/components/case-origin-badge";
import { FirstScreeningOnboarding } from "@/components/first-screening-onboarding";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type DashboardCheck = {
  id: string;
  status: "pending_upload" | "documents_received" | "under_review" | "report_ready";
  created_at: string;
  requested_documents: string[];
  tenant_full_name: string;
  tenant_email: string | null;
  properties: {
    city: string | null;
    monthly_rent: number | null;
    name: string;
  } | null;
  ai_reports: {
    recommendation: "approve" | "conditional" | "decline";
    score: number;
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
  { id: "pending_review", label: "In review" },
  { id: "completed", label: "Completed" },
  { id: "awaiting_upload", label: "Upload" },
] as const;

const SORT_OPTIONS = [
  { id: "recent", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "score_desc", label: "Lowest risk" },
  { id: "score_asc", label: "Highest risk" },
  { id: "progress_desc", label: "Upload %" },
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

export function LandlordDashboardBoard({
  checks,
  isFirstWorkspace = false,
}: {
  checks: DashboardCheck[];
  isFirstWorkspace?: boolean;
}) {
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
    <div className="space-y-2">
      <details className="workspace-disclosure group" id="new-screening" open={isFirstWorkspace || checks.length === 0}>
        <summary className="workspace-disclosure__summary">
          <div>
            <p className="text-xs font-semibold text-slate-950">New screening</p>
            <p className="text-[10px] text-slate-500">Create case · issue upload link</p>
          </div>
          <span className="workspace-disclosure__chevron">
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </summary>
        <div className="workspace-disclosure__content">
          <NewCheckForm />
        </div>
      </details>

      <section className="workspace-card space-y-2" id="tenant-cases">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Case registry</p>
            <h2 className="text-sm font-semibold text-slate-950">Tenant screening file</h2>
          </div>
          {!isFirstWorkspace ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((filter) => (
                <button
                  className={cn("filter-chip", activeFilter === filter.id && "filter-chip--active")}
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!isFirstWorkspace ? (
          <>
            <div className="flex flex-col gap-1.5 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  className="input input--compact w-full pl-8"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tenant or property"
                  type="search"
                  value={searchQuery}
                />
              </label>
              <label className="relative min-w-0 sm:w-40">
                <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <select
                  className="input input--compact w-full appearance-none pl-8"
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

            <p className="text-[10px] text-slate-500">
              {filteredChecks.length} of {checks.length} cases
            </p>
          </>
        ) : null}

        {isFirstWorkspace ? (
          <FirstScreeningOnboarding />
        ) : filteredChecks.length === 0 ? (
          <WorkspaceState
            description="Adjust filters or search."
            title="No matching cases"
            variant="filter"
          />
        ) : (
          <div className="ops-table-wrap">
            <div className="ops-table-head hidden lg:grid">
              <span>Tenant</span>
              <span>Property</span>
              <span>Status</span>
              <span className="text-right">Risk</span>
              <span className="text-right">Upload</span>
            </div>
            <div>
              {filteredChecks.map((check) => {
                const uploadedCount = check.tenant_documents.length;
                const requestedCount = Math.max(check.requested_documents.length, 1);
                const uploadProgress = getUploadProgress(uploadedCount, requestedCount);
                const recommendation = check.ai_reports?.recommendation ?? null;
                const riskScore = check.ai_reports?.score ?? null;

                return (
                  <Link
                    className="ops-table-row group block lg:grid"
                    href={`/dashboard/checks/${check.id}`}
                    key={check.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="truncate text-sm font-medium text-slate-950">{check.tenant_full_name}</span>
                        <CaseOriginBadge checkId={check.id} />
                      </div>
                      <p className="text-[10px] text-slate-500 lg:hidden">
                        {formatDate(check.created_at)} · {formatCurrency(check.properties?.monthly_rent)}
                      </p>
                    </div>
                    <div className="min-w-0 text-xs text-slate-600">
                      <p className="truncate font-medium text-slate-800">{check.properties?.name ?? "—"}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {check.properties?.city ?? "Greece"} · {formatCurrency(check.properties?.monthly_rent)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge tone={STATUS_TONE[check.status]}>{humanize(check.status)}</Badge>
                      {recommendation ? (
                        <Badge tone={RECOMMENDATION_TONE[recommendation]}>{humanize(recommendation)}</Badge>
                      ) : null}
                    </div>
                    <div className="flex justify-start lg:justify-end">
                      <RiskChip score={riskScore} />
                    </div>
                    <div className="flex items-center justify-between gap-2 lg:justify-end">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{uploadProgress}%</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 group-hover:text-slate-700">
                        Open
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
