"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { activateTenantWorkflowAction, type ActionState } from "@/app/actions";
import { Badge } from "@/components/badge";
import { CreateUploadLinkButton } from "@/components/create-upload-link-button";
import { FormStatusMessage } from "@/components/form-status-message";
import { PlanRequiredModal } from "@/components/plan-required-modal";
import { SubmitButton } from "@/components/submit-button";
import { UnlockWorkflowModal } from "@/components/unlock-workflow-modal";
import { useLocale, useT } from "@/lib/i18n/context";
import type { CaseAccessContext } from "@/lib/workspace-access";
import { canUseCapability } from "@/lib/workspace-access";

const initialState: ActionState = {};

type CaseWorkflowPanelProps = {
  caseAccess: CaseAccessContext;
  checkId: string;
  secureUploadUrl: string | null;
  tenantEmail: string | null;
  uploadTokenExpiresAt: string | null;
  workflowStatusLabel: string;
};

export function CaseWorkflowPanel({
  caseAccess,
  checkId,
  secureUploadUrl,
  tenantEmail,
  uploadTokenExpiresAt,
  workflowStatusLabel,
}: CaseWorkflowPanelProps) {
  const { locale } = useLocale();
  const t = useT();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const activateAction = activateTenantWorkflowAction.bind(null, checkId);
  const [activateState, activateFormAction] = useActionState(activateAction, initialState);

  useEffect(() => {
    if (activateState.kind === "unlock_required") {
      setPlanModalOpen(true);
    }
  }, [activateState.kind]);

  const canSendLink = canUseCapability(caseAccess, "send_upload_link");
  const canViewLink = canUseCapability(caseAccess, "view_live_upload_link");
  const canExportReport = canUseCapability(caseAccess, "export_trust_report");

  function openTrustReportUnlock() {
    setUnlockOpen(true);
  }

  const expiryLabel = uploadTokenExpiresAt
    ? new Date(uploadTokenExpiresAt).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB")
    : "—";

  return (
    <>
      <div className="card space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("workspace.uploadSectionKicker")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("workspace.uploadSectionTitle")}</h2>
          </div>
          <Badge tone={caseAccess.isDraft ? "warning" : "info"}>{workflowStatusLabel}</Badge>
        </div>

        {caseAccess.isDraft ? (
          <div className="rounded-3xl border border-[#e9dfc5] bg-[#fcfaf4] px-4 py-4 text-sm leading-7 text-[#5d4e31]">
            {t("workspace.draftNotice")}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          {canViewLink && secureUploadUrl ? (
            <p className="break-all text-sm font-medium text-slate-800">{secureUploadUrl}</p>
          ) : (
            <p className="text-sm text-slate-600">{t("workspace.uploadLinkLocked")}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-600">{t("auth.email")}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{tenantEmail ?? t("workspace.emailPending")}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-600">{t("workspace.linkExpiry")}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{expiryLabel}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {caseAccess.isDraft ? (
            <CreateUploadLinkButton
              canActivate={canSendLink}
              formAction={activateFormAction}
              labelKey="workspace.activateWorkflow"
              pendingLabel={t("workspace.activatePending")}
            />
          ) : canSendLink ? (
            <form action={activateFormAction} className="w-full sm:w-auto">
              <SubmitButton className="workspace-cta-secondary w-full sm:w-auto" pendingLabel={t("workspace.resendPending")} variant="secondary">
                {t("workspace.resendUploadLink")}
              </SubmitButton>
            </form>
          ) : (
            <CreateUploadLinkButton
              canActivate={false}
              labelKey="workspace.activateWorkflow"
              pendingLabel={t("workspace.activatePending")}
            />
          )}

          {canExportReport ? (
            <Link
              className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold text-slate-800 sm:w-auto"
              href={`/dashboard/checks/${checkId}/trust-report`}
            >
              {t("workspace.exportTrustReport")}
            </Link>
          ) : (
            <button
              className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold text-slate-800 sm:w-auto"
              onClick={openTrustReportUnlock}
              type="button"
            >
              {t("workspace.exportTrustReport")}
            </button>
          )}
        </div>

        <FormStatusMessage state={activateState} />
      </div>

      <PlanRequiredModal onClose={() => setPlanModalOpen(false)} open={planModalOpen} />
      <UnlockWorkflowModal checkId={checkId} onClose={() => setUnlockOpen(false)} open={unlockOpen} trigger="trust_report" />
    </>
  );
}
