import Link from "next/link";
import { ChevronDown, ExternalLink, Presentation } from "lucide-react";
import { Badge } from "@/components/badge";
import { StatCard } from "@/components/stat-card";
import {
  getDemoCasePresentationCards,
  getDemoDashboardAnalytics,
  getDemoProtectionCards,
} from "@/lib/demo-data";

const RECOMMENDATION_TONE = {
  approve: "success",
  conditional: "warning",
  decline: "danger",
} as const;

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export function DashboardPresentationPanel() {
  const demoCases = getDemoCasePresentationCards();
  const demoAnalytics = getDemoDashboardAnalytics();
  const demoProtectionCards = getDemoProtectionCards();

  return (
    <details className="workspace-disclosure group">
      <summary className="workspace-disclosure__summary">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50/80">
            <Presentation className="h-4 w-4 text-amber-800" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-slate-950">Presentation & investor analytics</p>
            <p className="text-xs leading-5 text-slate-600">
              Curated demo metrics and sample cases — separate from your live operational workspace.
            </p>
          </div>
        </div>
        <span className="workspace-disclosure__chevron">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>

      <div className="workspace-disclosure__content space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 px-4 py-3">
          <p className="text-xs leading-5 text-amber-950/80">
            Demo portfolio data is for walkthroughs only. Live cases appear in the case board above.
          </p>
          <Link className="workspace-cta-secondary shrink-0" href="/demo">
            Open guided demo
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard hint="Presentation portfolio" label="Active cases" value={demoAnalytics.activeCases} />
          <StatCard hint="Presentation portfolio" label="Protected rentals" value={demoAnalytics.protectedRentals} />
          <StatCard hint="Presentation portfolio" label="Avg. risk score" value={demoAnalytics.averageRiskScore} />
          <StatCard
            hint="Presentation portfolio"
            label="Eligibility rate"
            value={demoAnalytics.protectionEligibilityRate}
          />
          <StatCard hint="Presentation portfolio" label="Pending docs" value={demoAnalytics.pendingDocuments} />
          <StatCard hint="Presentation portfolio" label="Awaiting review" value={demoAnalytics.awaitingReview} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Protection options</p>
            <div className="mt-3 space-y-2">
              {demoProtectionCards.map((item) => (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3" key={item.name}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                    <Badge tone="neutral">{item.estimatedPrice}</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {demoCases.map((item) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">{item.label}</h3>
                  <Badge tone={RECOMMENDATION_TONE[item.recommendation]}>{humanize(item.recommendation)}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.tenantName}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>Score {item.riskScore}/100</span>
                  <span>·</span>
                  <span>{item.protectionPackage}</span>
                </div>
                <Link className="workspace-cta-secondary mt-3 w-full" href={`/dashboard/checks/${item.id}`}>
                  View sample report
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
