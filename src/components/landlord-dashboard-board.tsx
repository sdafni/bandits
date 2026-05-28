"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Plus, Search, X } from "lucide-react";
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

function CaseRowContent({
  check,
  uploadProgress,
  recommendation,
  riskScore,
}: {
  check: DashboardCheck;
  uploadProgress: number;
  recommendation: "approve" | "conditional" | "decline" | null;
  riskScore: number | null;
}) {
  return (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-base font-semibold text-primary sm:text-sm sm:font-medium">{check.tenant_full_name}</span>
          <CaseOriginBadge checkId={check.id} />
        </div>
        <p className="ops-case-card__meta mt-1 lg:hidden">
          {formatDate(check.created_at)} · {formatCurrency(check.properties?.monthly_rent)}
        </p>
      </div>
      <div className="min-w-0 text-sm text-secondary">
        <p className="truncate font-semibold text-primary">{check.properties?.name ?? "—"}</p>
        <p className="ops-case-card__meta truncate">
          {check.properties?.city ?? "Greece"} · {formatCurrency(check.properties?.monthly_rent)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={STATUS_TONE[check.status]}>{humanize(check.status)}</Badge>
        {recommendation ? (
          <Badge tone={RECOMMENDATION_TONE[recommendation]}>{humanize(recommendation)}</Badge>
        ) : null}
      </div>
      <div className="flex justify-start lg:justify-end">
        <RiskChip score={riskScore} />
      </div>
      <div className="flex items-center justify-between gap-2 lg:justify-end">
        <span className="text-base font-semibold tabular-nums text-primary sm:text-sm">{uploadProgress}%</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Open</span>
      </div>
    </>
  );
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
  const [isCreateFlowOpen, setIsCreateFlowOpen] = useState(false);

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
    <div className="space-y-3 sm:space-y-2">
      <section className="workspace-card" id="new-screening">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="section-label">Quick actions</p>
            <h2 className="text-base font-semibold text-primary sm:text-sm">Open new case</h2>
            <p className="text-xs text-muted">Launch guided screening wizard</p>
          </div>
          <button className="workspace-cta w-full sm:w-auto" onClick={() => setIsCreateFlowOpen(true)} type="button">
            <Plus className="h-4 w-4" />
            New screening
          </button>
        </div>
      </section>

      <section className="workspace-card space-y-3 sm:space-y-2" id="tenant-cases">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:pb-2">
          <div>
            <p className="section-label">Case registry</p>
            <h2 className="text-base font-semibold text-primary sm:text-sm">Tenant screening file</h2>
          </div>
          {!isFirstWorkspace ? (
            <div className="flex flex-wrap gap-2">
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="input input--compact w-full pl-10"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tenant or property"
                  type="search"
                  value={searchQuery}
                />
              </label>
              <label className="relative min-w-0 sm:w-44">
                <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <select
                  className="input input--compact w-full appearance-none pl-10"
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

            <p className="text-xs text-muted sm:text-[11px]">
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

            <div className="space-y-2 lg:space-y-0">
              {filteredChecks.map((check) => {
                const uploadedCount = check.tenant_documents.length;
                const requestedCount = Math.max(check.requested_documents.length, 1);
                const uploadProgress = getUploadProgress(uploadedCount, requestedCount);
                const recommendation = check.ai_reports?.recommendation ?? null;
                const riskScore = check.ai_reports?.score ?? null;

                return (
                  <Link
                    className="ops-case-card ops-table-row group"
                    href={`/dashboard/checks/${check.id}`}
                    key={check.id}
                  >
                    <CaseRowContent
                      check={check}
                      recommendation={recommendation}
                      riskScore={riskScore}
                      uploadProgress={uploadProgress}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {isCreateFlowOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-0 sm:items-center sm:justify-center sm:p-6"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:max-w-3xl sm:rounded-2xl sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="section-label">New screening</p>
                <h3 className="text-base font-semibold text-primary">Guided tenant screening workflow</h3>
              </div>
              <button
                aria-label="Close new screening flow"
                className="workspace-cta-secondary workspace-cta-secondary--compact"
                onClick={() => setIsCreateFlowOpen(false)}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <NewCheckForm onCancel={() => setIsCreateFlowOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
