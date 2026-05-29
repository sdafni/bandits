import type { Database, Recommendation } from "@/lib/database.types";
import { Badge } from "@/components/badge";
import { cn, formatCurrency } from "@/lib/utils";

type AiReport = Database["public"]["Tables"]["ai_reports"]["Row"];

type AiScreeningReportProps = {
  applicantName: string;
  propertyMonthlyRent: number | null;
  report: AiReport;
  tenantMonthlyIncome: number | null;
};

const RECOMMENDATION_META: Record<
  Recommendation,
  {
    badgeTone: "success" | "warning" | "danger";
    finalRecommendation: string;
    helper: string;
    level: string;
    title: string;
  }
> = {
  approve: {
    badgeTone: "success",
    finalRecommendation:
      "Proceed with the tenancy decision. The current file shows strong affordability coverage, a credible document pack, and no material risk signals that require escalation.",
    helper: "Fit to proceed subject to standard tenancy completion steps.",
    level: "Recommended",
    title: "Recommended profile",
  },
  conditional: {
    badgeTone: "warning",
    finalRecommendation:
      "Proceed only after the outstanding items are resolved. The case is workable, but the file should not move to a final approval until the missing evidence and highlighted review points are closed.",
    helper: "Additional evidence and a short manual review are still required.",
    level: "Recommended with caution",
    title: "Caution-led recommendation",
  },
  decline: {
    badgeTone: "danger",
    finalRecommendation:
      "Do not proceed on the current file. The application presents material affordability or consistency concerns that should be escalated before any tenancy commitment is considered.",
    helper: "Escalation recommended before any further progression.",
    level: "High risk profile",
    title: "Material risk visibility",
  },
};

function getScoreBand(score: number) {
  if (score >= 80) {
    return {
      accent: "#0f766e",
      label: "Low risk",
      ringTrack: "rgba(15, 118, 110, 0.12)",
      surface: "bg-[linear-gradient(180deg,rgba(240,253,250,0.94),rgba(255,255,255,1))]",
      text: "Signals are within the present check tolerance.",
    };
  }

  if (score >= 60) {
    return {
      accent: "#8b6b17",
      label: "Moderate risk",
      ringTrack: "rgba(139, 107, 23, 0.12)",
      surface: "bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,255,255,1))]",
      text: "The case remains workable but requires conditions.",
    };
  }

  return {
    accent: "#be123c",
    label: "Elevated risk",
    ringTrack: "rgba(190, 18, 60, 0.12)",
    surface: "bg-[linear-gradient(180deg,rgba(255,241,242,0.9),rgba(255,255,255,1))]",
    text: "Material adverse signals are present in the file.",
  };
}

function getMetricTone(value: number | null | undefined) {
  if (value == null) {
    return {
      bar: "bg-slate-300",
      badgeTone: "info" as const,
      label: "Pending",
    };
  }

  if (value >= 80) {
    return {
      bar: "bg-emerald-600",
      badgeTone: "success" as const,
      label: "Strong",
    };
  }

  if (value >= 60) {
    return {
      bar: "bg-[#8b6b17]",
      badgeTone: "warning" as const,
      label: "Review",
    };
  }

  return {
    bar: "bg-rose-600",
    badgeTone: "danger" as const,
    label: "Concern",
  };
}

function formatMetric(value: number | null | undefined) {
  return value == null ? "Pending" : `${Math.round(value)}/100`;
}

function buildConsistencyChecks(report: AiReport) {
  const reasoning = report.reasoning;
  const extractedSignals = reasoning.extractedSignals ?? [];
  const missingCount = reasoning.missingDocumentCount ?? report.missing_documents.length;

  return [
    buildMetricCheck(
      "Identity evidence",
      reasoning.identityConfidence,
      "Government-issued identity evidence appears consistent with the submitted pack.",
      "Identity evidence is present, but manual spot-checking is advised.",
      "Identity evidence is limited or inconsistent within the file.",
    ),
    buildMetricCheck(
      "Employment and residency alignment",
      reasoning.employmentResidencyConfidence,
      "Employment and residency details appear aligned across the submitted evidence.",
      "Core profile details are present, although some supporting points still merit review.",
      "Employment or residency support remains weak and should be verified before proceeding.",
    ),
    buildMetricCheck(
      "Document pack completeness",
      reasoning.documentCompleteness,
      "The requested document set is substantially complete.",
      "The file is usable, but further evidence is still outstanding.",
      "Material document gaps remain in the current check file.",
      missingCount > 0 ? `${missingCount} item(s) still outstanding.` : "No outstanding document gaps are recorded.",
    ),
    extractedSignals.length === 0
      ? {
          detail: "No adverse watch terms were surfaced in the extracted document content.",
          label: "Adverse term scan",
          state: "pass" as const,
          value: "Clear",
        }
      : {
          detail:
            extractedSignals.length === 1
              ? `One term requires review: ${extractedSignals[0]}.`
              : `Multiple terms require review: ${extractedSignals.join(", ")}.`,
          label: "Adverse term scan",
          state: extractedSignals.length > 1 ? ("concern" as const) : ("review" as const),
          value: `${extractedSignals.length} flag${extractedSignals.length === 1 ? "" : "s"}`,
        },
  ];
}

function buildMetricCheck(
  label: string,
  value: number | null | undefined,
  strongDetail: string,
  reviewDetail: string,
  concernDetail: string,
  overrideDetail?: string,
) {
  if (value == null) {
    return {
      detail: overrideDetail ?? "This check is still pending because the required evidence is incomplete.",
      label,
      state: "review" as const,
      value: "Pending",
    };
  }

  if (value >= 80) {
    return {
      detail: overrideDetail ?? strongDetail,
      label,
      state: "pass" as const,
      value: `${Math.round(value)}/100`,
    };
  }

  if (value >= 60) {
    return {
      detail: overrideDetail ?? reviewDetail,
      label,
      state: "review" as const,
      value: `${Math.round(value)}/100`,
    };
  }

  return {
    detail: overrideDetail ?? concernDetail,
    label,
    state: "concern" as const,
    value: `${Math.round(value)}/100`,
  };
}

function getCheckTone(state: "pass" | "review" | "concern") {
  if (state === "pass") {
    return {
      badgeTone: "success" as const,
      dot: "bg-emerald-600",
      label: "Pass",
    };
  }

  if (state === "review") {
    return {
      badgeTone: "warning" as const,
      dot: "bg-[#8b6b17]",
      label: "Review",
    };
  }

  return {
    badgeTone: "danger" as const,
    dot: "bg-rose-600",
    label: "Concern",
  };
}

function formatCoverageMultiple(debtToIncomeRatio: number | null | undefined) {
  if (debtToIncomeRatio == null || debtToIncomeRatio <= 0) {
    return "Pending";
  }

  return `${(1 / debtToIncomeRatio).toFixed(1)}x`;
}

function formatIncomeBurden(debtToIncomeRatio: number | null | undefined) {
  if (debtToIncomeRatio == null) {
    return "Affordability could not yet be calculated from the file.";
  }

  return `Rent equals ${Math.round(debtToIncomeRatio * 100)}% of reported monthly income.`;
}

function formatDocumentLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function AiScreeningReport({
  applicantName,
  propertyMonthlyRent,
  report,
  tenantMonthlyIncome,
}: AiScreeningReportProps) {
  const recommendationMeta = RECOMMENDATION_META[report.recommendation];
  const scoreBand = getScoreBand(report.score);
  const ratio = report.reasoning.debtToIncomeRatio;
  const ratioTone = ratio == null ? "info" : ratio <= 0.33 ? "success" : ratio <= 0.45 ? "warning" : "danger";
  const metrics = [
    {
      helper: "Identity and official evidence",
      label: "Identity confidence",
      value: report.reasoning.identityConfidence,
    },
    {
      helper: "Income continuity and employment profile",
      label: "Income stability",
      value: report.reasoning.incomeStability,
    },
    {
      helper: "Affordability against monthly rent",
      label: "Rent affordability",
      value: report.reasoning.rentAffordability,
    },
    {
      helper: "Cross-file employment and residency support",
      label: "Employment / residency",
      value: report.reasoning.employmentResidencyConfidence,
    },
    {
      helper: "Requested evidence coverage",
      label: "Document completeness",
      value: report.reasoning.documentCompleteness,
    },
  ];
  const consistencyChecks = buildConsistencyChecks(report);
  const summaryInsights = Array.from(new Set([...report.strengths, ...report.reasoning.reviewNotes])).slice(0, 6);

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "overflow-hidden rounded-[32px] border border-slate-200/80 p-5 shadow-[0_18px_40px_rgba(15,35,67,0.08)] sm:p-7",
          scoreBand.surface,
        )}
      >
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="info">SafeKey Report summary</Badge>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Underwriting summary
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                  {recommendationMeta.title}
                </h3>
                <Badge tone={recommendationMeta.badgeTone}>{recommendationMeta.level}</Badge>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-slate-700 sm:text-[15px]">
                {report.summary}
              </p>
              <p className="text-sm font-medium text-slate-600">
                {applicantName} is currently assessed as <span className="text-slate-950">{scoreBand.label.toLowerCase()}</span>.{" "}
                {recommendationMeta.helper}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Recommendation level
                </p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{recommendationMeta.level}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{scoreBand.text}</p>
              </div>

              <div className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Income / rent ratio
                    </p>
                    <p className="mt-3 text-xl font-semibold text-slate-950">{formatCoverageMultiple(ratio)}</p>
                  </div>
                  <Badge tone={ratioTone}>{ratio == null ? "Pending" : `${Math.round(ratio * 100)}% burden`}</Badge>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{formatIncomeBurden(ratio)}</p>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  Reported income {formatCurrency(tenantMonthlyIncome)} against rent {formatCurrency(propertyMonthlyRent)}.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tenant risk score</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Composite assessment across affordability, identity, file coverage, and extracted risk terms.
                </p>
              </div>
              <Badge tone={recommendationMeta.badgeTone}>{scoreBand.label}</Badge>
            </div>

            <div className="mt-6 flex items-center gap-5">
              <div
                className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(${scoreBand.accent} ${Math.max(0, Math.min(360, report.score * 3.6))}deg, ${scoreBand.ringTrack} 0deg)`,
                }}
              >
                <div className="grid h-[102px] w-[102px] place-items-center rounded-full bg-white">
                  <div className="text-center">
                    <p className="text-3xl font-semibold tracking-tight text-slate-950">{report.score}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">out of 100</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score interpretation</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{scoreBand.label}</p>
                </div>
                <p className="text-sm leading-7 text-slate-600">{scoreBand.text}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Final recommendation</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{recommendationMeta.finalRecommendation}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,35,67,0.05)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk factor analysis</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">Core check metrics</h4>
            </div>
            <p className="text-xs font-medium text-slate-500">Normalized underwriting signals</p>
          </div>

          <div className="mt-5 space-y-4">
            {metrics.map((metric) => {
              const tone = getMetricTone(metric.value);

              return (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4" key={metric.label}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{metric.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{metric.helper}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={tone.badgeTone}>{tone.label}</Badge>
                      <p className="text-sm font-semibold text-slate-950">{formatMetric(metric.value)}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-300", tone.bar)}
                      style={{ width: `${Math.max(8, Math.min(100, metric.value ?? 8))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,35,67,0.05)] sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Document consistency checks</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950">Evidence integrity review</h4>
          </div>

          <div className="mt-5 space-y-3">
            {consistencyChecks.map((check) => {
              const tone = getCheckTone(check.state);

              return (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4" key={check.label}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{check.label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{check.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={tone.badgeTone}>{tone.label}</Badge>
                      <span className="text-sm font-semibold text-slate-950">{check.value}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,35,67,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Red flags</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">Adverse findings</h4>
            </div>
            <Badge tone={report.red_flags.length > 0 ? "danger" : "success"}>
              {report.red_flags.length > 0 ? `${report.red_flags.length} flagged` : "None"}
            </Badge>
          </div>

          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {report.red_flags.length > 0 ? (
              report.red_flags.map((flag) => (
                <li className="rounded-[20px] border border-rose-100 bg-rose-50/70 px-4 py-3" key={flag}>
                  {flag}
                </li>
              ))
            ) : (
              <li className="rounded-[20px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-emerald-800">
                No material red flags are highlighted in the current check file.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,35,67,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Missing documents</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">Outstanding evidence</h4>
            </div>
            <Badge tone={report.missing_documents.length > 0 ? "warning" : "success"}>
              {report.missing_documents.length > 0 ? `${report.missing_documents.length} open` : "Complete"}
            </Badge>
          </div>

          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {report.missing_documents.length > 0 ? (
              report.missing_documents.map((item) => (
                <li className="rounded-[20px] border border-[#e9dfc5] bg-[#fcfaf4] px-4 py-3" key={item}>
                  {formatDocumentLabel(item)}
                </li>
              ))
            ) : (
              <li className="rounded-[20px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-emerald-800">
                All requested documents were submitted for this review.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,35,67,0.05)] sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Summary insights</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950">Analyst highlights</h4>
          </div>

          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {summaryInsights.length > 0 ? (
              summaryInsights.map((item) => (
                <li className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3" key={item}>
                  {item}
                </li>
              ))
            ) : (
              <li className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                {report.summary}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
