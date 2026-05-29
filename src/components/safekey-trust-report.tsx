import { Badge } from "@/components/badge";
import { getDocumentLabel } from "@/lib/trust-workflows";

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
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SafeKey Trust Report</p>
          <h2 className="text-xl font-semibold text-slate-950">{report.confidenceLevel}</h2>
          <p className="text-sm text-slate-600">
            {report.confidenceScore}/100 confidence score · Case {caseId}
          </p>
        </div>
        <Badge tone={report.confidenceScore >= 70 ? "success" : report.confidenceScore >= 45 ? "warning" : "danger"}>
          {report.recommendation}
        </Badge>
      </div>

      <p className="text-sm text-slate-600">
        SafeKey provides trust visibility, document completeness, and risk guidance. Final tenancy decisions remain with the landlord.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReportList title="Identity verification" values={report.identitySection} />
        <ReportList title="Financial visibility" values={report.financialSection} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Document completeness</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          {report.documentChecklist.map((item) => (
            <li key={item.label}>
              {item.state === "complete" ? "✅" : item.state === "warning" ? "⚠" : "❌"} {item.label}
            </li>
          ))}
        </ul>
      </div>

      <ReportList
        title="Rental risk indicators"
        values={report.rentalRiskIndicators.length > 0 ? report.rentalRiskIndicators : ["No additional profile indicators detected."]}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Missing items guidance</p>
        <p className="mt-2 text-sm text-slate-700">{report.missingItemsGuidance}</p>
        {report.recommendedMissing.length > 0 ? (
          <p className="mt-2 text-sm text-slate-700">
            Recommended missing: {report.recommendedMissing.map(getDocumentLabel).join(", ")}
          </p>
        ) : null}
      </div>

      <ReportList
        title="SafeKey analyst notes"
        values={[report.analystNotes]}
      />

      <ReportList
        title="Protection suggestions"
        values={report.protectionSuggestions.length > 0 ? report.protectionSuggestions : ["No additional protection suggestion required."]}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Trust compliance snapshot</p>
        <p className="mt-2 text-sm text-slate-700">
          Consent: {report.underwritingReadiness.consentRecord.granted ? "Recorded" : "Pending"} ·
          Updates: {report.auditTrail.length} ·
          Document history entries: {report.underwritingReadiness.documentHistory.length}
        </p>
      </div>

      <p className="text-xs text-slate-500">Generated at {generatedAt}</p>
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
