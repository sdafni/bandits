"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/badge";
import { RiskChip } from "@/components/risk-chip";
import { CaseOriginBadge } from "@/components/case-origin-badge";
import { DeleteCheckButton } from "@/components/delete-check-button";
import {
  DASHBOARD_TIER_FEATURES,
  type DashboardCheck,
  type DashboardTier,
} from "@/lib/dashboard-tier";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";
import { resolveDocumentCollectionPhase } from "@/lib/document-submission";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { canLandlordRemoveCheck } from "@/lib/check-removal";
import { isDemoCheckId } from "@/lib/demo-data";

const STATUS_TONE = {
  draft: "warning",
  pending_upload: "warning",
  documents_received: "neutral",
  under_review: "warning",
  report_ready: "success",
} as const;

function useHumanStatusLabel() {
  const t = useT();

  return (check: DashboardCheck) => {
    if (check.status === "report_ready") {
      return t("dashboard.statusRecommendationReady");
    }
    if (check.status === "under_review") {
      return t("dashboard.statusUnderReview");
    }

    const collection = resolveDocumentCollectionPhase({
      requested_documents: check.requested_documents,
      status: check.status,
      tenant_documents: check.tenant_documents,
    });

    if (collection.phase === "documents_complete") {
      return t("dashboard.statusDocumentsComplete");
    }
    if (collection.phase === "partial_submission") {
      return t("dashboard.statusPartialSubmission");
    }
    if (check.status === "pending_upload" && check.workflow_activated_at) {
      if (check.upload_token_expires_at && new Date(check.upload_token_expires_at).getTime() < Date.now()) {
        return t("dashboard.statusLinkExpired");
      }
      return t("dashboard.statusAwaitingDocuments");
    }
    return t("dashboard.statusDraft");
  };
}

export function DashboardCheckList({
  checks,
  onCheckRemoved,
  tier,
}: {
  checks: DashboardCheck[];
  onCheckRemoved?: (message: string) => void;
  tier: DashboardTier;
}) {
  const t = useT();
  const { locale } = useLocale();
  const features = DASHBOARD_TIER_FEATURES[tier];
  const getStatusLabel = useHumanStatusLabel();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChecks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    let result = [...checks];

    if (normalizedQuery) {
      result = result.filter((check) => {
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
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (features.recentScreeningsLimit != null) {
      return result.slice(0, features.recentScreeningsLimit);
    }

    return result;
  }, [checks, features.recentScreeningsLimit, searchQuery]);

  const showSearch = checks.length > 3;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5" id="tenant-cases">
      <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">{t("dashboard.listTitle")}</h2>

      {showSearch ? (
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input input--compact w-full pl-10"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            type="search"
            value={searchQuery}
          />
        </label>
      ) : null}

      {filteredChecks.length === 0 ? (
        <p className="py-10 text-center text-sm leading-7 text-slate-500">{t("dashboard.emptyList")}</p>
      ) : (
        <ul className={cn("space-y-2.5", showSearch && "mt-3")}>
          {filteredChecks.map((check) => {
            const removable = isDemoCheckId(check.id) || canLandlordRemoveCheck(check);

            return (
            <li key={check.id}>
              <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 transition hover:border-slate-300 hover:bg-white">
                <Link
                  className="block px-4 py-4 pr-16"
                  href={withLocalePath(locale, `/dashboard/checks/${check.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-950">{check.tenant_full_name}</p>
                        <CaseOriginBadge checkId={check.id} />
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        {check.properties?.name ?? "—"}
                        {check.properties?.city ? ` · ${check.properties.city}` : ""}
                      </p>
                      {features.showRentLine && check.properties?.monthly_rent != null ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(check.created_at)} · {formatCurrency(check.properties.monthly_rent)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">{formatDate(check.created_at)}</p>
                      )}
                    </div>
                    {check.status === "report_ready" && check.ai_reports ? (
                      <RiskChip score={check.ai_reports.score ?? null} />
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Badge tone={STATUS_TONE[check.status]}>{getStatusLabel(check)}</Badge>
                  </div>
                </Link>
                {removable ? (
                  <div className="absolute right-3 top-3">
                    <DeleteCheckButton
                      checkId={check.id}
                      checkLabel={check.tenant_full_name}
                      compact
                      onDeleted={onCheckRemoved}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
          })}
        </ul>
      )}
    </section>
  );
}
