"use client";

import { useState } from "react";
import { SafeKeyTrustReport } from "@/components/safekey-trust-report";
import { UnlockWorkflowModal } from "@/components/unlock-workflow-modal";
import { useT } from "@/lib/i18n/context";
import type { CaseAccessContext } from "@/lib/workspace-access";
import { canUseCapability } from "@/lib/workspace-access";
import type { buildTrustWorkflowReport } from "@/lib/trust-workflows";

type TrustWorkflowReport = ReturnType<typeof buildTrustWorkflowReport>;

export function CaseTrustReportSection({
  caseAccess,
  caseId,
  generatedAt,
  report,
}: {
  caseAccess: CaseAccessContext;
  caseId: string;
  generatedAt: string;
  report: TrustWorkflowReport;
}) {
  const t = useT();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const canView = canUseCapability(caseAccess, "export_trust_report");

  if (!canView) {
    return (
      <>
        <div className="card space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("workspace.unlockKicker")}</p>
          <h2 className="text-2xl font-semibold text-slate-950">{t("workspace.unlockTitle")}</h2>
          <p className="text-sm leading-7 text-slate-600">{t("workspace.unlockBodyReport")}</p>
          <button className="workspace-cta w-full sm:w-auto" onClick={() => setUnlockOpen(true)} type="button">
            {t("workspace.exportTrustReport")}
          </button>
        </div>
        <UnlockWorkflowModal checkId={caseId} onClose={() => setUnlockOpen(false)} open={unlockOpen} trigger="trust_report" />
      </>
    );
  }

  return <SafeKeyTrustReport caseId={caseId} generatedAt={generatedAt} report={report} />;
}
