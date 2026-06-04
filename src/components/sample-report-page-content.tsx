"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileDown } from "lucide-react";
import { Badge } from "@/components/badge";
import { SafeKeyTrustReport } from "@/components/safekey-trust-report";
import { buildStartCheckLoginHref } from "@/lib/billing-navigation";
import { getDocumentLabel } from "@/lib/trust-workflows";
import { getSampleTrustReport, sampleReportMeta, SAMPLE_REPORT_CASE_ID } from "@/lib/sample-report-data";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

const recommendationTone = {
  approve: "success",
  conditional: "warning",
  decline: "danger",
} as const;

export function SampleReportPageContent() {
  const { locale } = useLocale();
  const t = useT();
  const report = getSampleTrustReport();
  const startPath = buildStartCheckLoginHref(locale);
  const homePath = withLocalePath(locale, "/");
  const pdfPath = "/api/sample-report/pdf";

  return (
    <div className="page-shell flex max-w-full flex-col gap-8 overflow-x-hidden py-6 sm:gap-10 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href={homePath}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("landing.sampleReport.backHome")}
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("landing.sample.kicker")}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{t("landing.sampleReport.title")}</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700">{t("landing.sampleReport.intro")}</p>
        </div>
        <Link className="primary-action cta-breathe inline-flex min-h-12 items-center gap-2 self-start rounded-[16px] px-5 py-3 text-sm" href={startPath}>
          {t("hero.ctaPrimary")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" data-testid="sample-report-page">
        <div className="space-y-5">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0f2343] text-3xl font-bold text-white">
                  {sampleReportMeta.score}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.sample.trustScore")}</p>
                  <p className="text-xl font-semibold text-slate-950">{sampleReportMeta.tenantName}</p>
                  <p className="text-sm text-slate-600">{sampleReportMeta.propertyName}</p>
                </div>
              </div>
              <Badge tone={recommendationTone[sampleReportMeta.recommendation]}>
                {t("landing.sample.recommendation")}
              </Badge>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.sample.riskSummary")}</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{sampleReportMeta.riskSummary}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.sampleReport.recommendationTitle")}</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{sampleReportMeta.summary}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.sampleReport.documentsTitle")}</p>
                <ul className="mt-3 space-y-2">
                  {sampleReportMeta.uploadedDocuments.map((doc) => (
                    <li className="flex items-center gap-2 text-sm font-medium text-slate-800" key={doc}>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                      {getDocumentLabel(doc)}
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="space-y-2">
                {sampleReportMeta.strengths.map((strength) => (
                  <li className="flex gap-2 text-sm leading-6 text-slate-700" key={strength}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b6b17]" aria-hidden />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.sample.pdfLabel")}</p>
                <p className="text-lg font-semibold text-slate-950">SafeKey_Report_Maria_Papadopoulou.pdf</p>
              </div>
              <a
                className="secondary-action inline-flex min-h-11 items-center gap-2 rounded-[14px] px-4 py-2 text-sm"
                download
                href={pdfPath}
              >
                <FileDown className="h-4 w-4" />
                {t("landing.sampleReport.downloadPdf")}
              </a>
            </div>
            <div className="mt-4 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <iframe
                className="h-[min(72vh,640px)] max-w-full w-full bg-white"
                src={pdfPath}
                title={t("landing.sampleReport.pdfPreviewTitle")}
              />
            </div>
          </article>

          <SafeKeyTrustReport
            caseId={SAMPLE_REPORT_CASE_ID}
            generatedAt={sampleReportMeta.generatedAt}
            report={report}
          />
        </div>
      </section>
    </div>
  );
}
