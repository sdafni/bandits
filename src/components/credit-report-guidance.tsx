"use client";

import { ExternalLink } from "lucide-react";
import {
  TIRESIAS_PUBLIC_SERVICE_URL,
  type CreditReportWorkflowStatus,
} from "@/lib/credit-report";
import { useT } from "@/lib/i18n/context";

const STATUS_TONE: Record<CreditReportWorkflowStatus, string> = {
  not_provided: "bg-slate-100 text-slate-700",
  requested: "bg-sky-100 text-sky-900",
  uploaded: "bg-amber-100 text-amber-900",
  verified: "bg-emerald-100 text-emerald-900",
};

export function CreditReportGuidancePanel({
  onRequestCreditReport,
  status,
}: {
  onRequestCreditReport: () => void;
  status: CreditReportWorkflowStatus;
}) {
  const t = useT();

  return (
    <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t("creditReport.guidanceTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("creditReport.optionalHint")}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${STATUS_TONE[status]}`}
        >
          {t(`creditReport.status.${status}`)}
        </span>
      </div>

      <p className="text-xs leading-5 text-slate-700">{t("creditReport.tiresiasIntro")}</p>

      <ol className="list-decimal space-y-2 pl-5 text-xs leading-5 text-slate-700">
        <li>{t("creditReport.step1")}</li>
        <li>{t("creditReport.step2")}</li>
        <li>{t("creditReport.step3")}</li>
        <li>{t("creditReport.step4")}</li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <a
          className="inline-flex items-center gap-2 rounded-full bg-[#0f2343] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3358]"
          href={TIRESIAS_PUBLIC_SERVICE_URL}
          onClick={() => onRequestCreditReport()}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("creditReport.getFreeReportCta")}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>

      <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
        {t("creditReport.securityNotice")}
      </p>
    </div>
  );
}
