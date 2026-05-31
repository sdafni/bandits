"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FileDown, RefreshCw, FileText } from "lucide-react";
import { regenerateProfessionalReportAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

const initialState: ActionState = {};

type ProfessionalReportActionsProps = {
  checkId: string;
  hasPdf: boolean;
  hasAiReport: boolean;
};

export function ProfessionalReportActions({
  checkId,
  hasPdf,
  hasAiReport,
}: ProfessionalReportActionsProps) {
  const { locale } = useLocale();
  const t = useT();
  const action = regenerateProfessionalReportAction.bind(null, checkId);
  const [state, formAction] = useActionState(action, initialState);

  if (!hasAiReport) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">
            {t("caseDetail.professionalReportKicker")}
          </p>
          <p className="mt-1 text-sm text-slate-600">{t("caseDetail.professionalReportBody")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {hasPdf ? (
            <a
              className="workspace-cta inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] px-5 py-2.5 text-sm font-semibold"
              href={`/api/reports/${checkId}/download`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileDown className="h-4 w-4 shrink-0" aria-hidden />
              {t("caseDetail.downloadPdf")}
            </a>
          ) : (
            <span className="workspace-cta-secondary inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-[18px] px-5 py-2.5 text-sm font-semibold opacity-60">
              <FileDown className="h-4 w-4 shrink-0" aria-hidden />
              {t("caseDetail.pdfGenerating")}
            </span>
          )}

          <Link
            className="workspace-cta-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] px-5 py-2.5 text-sm font-semibold"
            href={withLocalePath(locale, `/dashboard/checks/${checkId}#safekey-report`)}
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            {t("caseDetail.viewReport")}
          </Link>

          <form action={formAction}>
            <SubmitButton
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[18px] px-5 py-2.5 text-sm font-semibold sm:w-auto"
              pendingLabel={t("caseDetail.regeneratingPdf")}
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              {t("caseDetail.regenerateReport")}
            </SubmitButton>
          </form>
        </div>
      </div>
      <FormStatusMessage state={state} />
    </div>
  );
}
