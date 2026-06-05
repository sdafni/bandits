"use client";

import { Badge } from "@/components/badge";
import { getDocumentLabel } from "@/lib/trust-workflows";
import { useT } from "@/lib/i18n/context";

type TrustReportData = ReturnType<typeof import("@/lib/trust-workflows").buildTrustWorkflowReport>;

export function SafeKeyTrustReport({
  caseId,
  generatedAt,
  report,
}: {
  caseId: string;
  generatedAt: string;
  report: TrustReportData;
}) {
  const t = useT();

  const rentalRisk =
    report.rentalRiskIndicators.length > 0 ? report.rentalRiskIndicators : [t("reportViewer.noRiskIndicators")];
  const nextSteps =
    report.protectionSuggestions.length > 0 ? report.protectionSuggestions : [t("reportViewer.noNextSteps")];

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("reportViewer.title")}</p>
          <h2 className="text-xl font-semibold text-slate-950">{report.confidenceLevel}</h2>
          <p className="text-sm text-slate-600">
            {t("reportViewer.scoreLine").replace("{score}", String(report.confidenceScore)).replace("{caseId}", caseId)}
          </p>
        </div>
        <Badge tone={report.confidenceScore >= 70 ? "success" : report.confidenceScore >= 45 ? "warning" : "danger"}>
          {report.recommendation}
        </Badge>
      </div>

      <p className="text-sm text-slate-600">{t("reportViewer.disclaimer")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReportList title={t("reportViewer.identitySection")} values={report.identitySection} />
        <ReportList title={t("reportViewer.financialSection")} values={report.financialSection} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
          {t("reportViewer.financialReliabilityTitle")}
        </p>
        <dl className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t("reportViewer.creditReportLabel")}</dt>
            <dd className="font-medium text-slate-900">
              {t(`reportViewer.creditReportValue.${report.financialReliability.creditReport}`)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("reportViewer.creditScoreLabel")}</dt>
            <dd className="font-medium text-slate-900">
              {t(`reportViewer.creditScoreValue.${report.financialReliability.creditScore}`)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t("reportViewer.creditReportSecurityNote")}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("reportViewer.documentCompleteness")}</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          {report.documentChecklist.map((item) => (
            <li key={item.label}>
              {item.state === "complete" ? "✅" : item.state === "warning" ? "⚠" : "❌"} {item.label}
            </li>
          ))}
        </ul>
      </div>

      <ReportList title={t("reportViewer.rentalRisk")} values={rentalRisk} />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("reportViewer.missingGuidance")}</p>
        <p className="mt-2 text-sm text-slate-700">{report.missingItemsGuidance}</p>
        {report.recommendedMissing.length > 0 ? (
          <p className="mt-2 text-sm text-slate-700">
            {t("reportViewer.recommendedMissing")}: {report.recommendedMissing.map(getDocumentLabel).join(", ")}
          </p>
        ) : null}
      </div>

      <ReportList title={t("reportViewer.analystNotes")} values={[report.analystNotes]} />

      <ReportList title={t("reportViewer.nextSteps")} values={nextSteps} />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("reportViewer.activityTitle")}</p>
        <p className="mt-2 text-sm text-slate-700">
          {t("reportViewer.activityLine")
            .replace(
              "{consent}",
              report.underwritingReadiness.consentRecord.granted
                ? t("reportViewer.consentRecorded")
                : t("reportViewer.consentPending"),
            )
            .replace("{updates}", String(report.auditTrail.length))
            .replace("{documents}", String(report.underwritingReadiness.documentHistory.length))}
        </p>
      </div>

      <p className="text-xs text-slate-500">
        {t("reportViewer.generatedAt")} {generatedAt}
      </p>
    </section>
  );
}

function ReportList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
        {values.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
