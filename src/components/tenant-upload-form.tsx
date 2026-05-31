"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentsAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import {
  getDocumentUploadFieldName,
  getUploadedDocumentTypes,
  isDocumentSubmissionComplete,
} from "@/lib/document-submission";
import {
  buildRequiredSlots,
  getPendingUploadDocumentTypes,
  getSlotDocumentTypes,
  isRequiredSlotReceived,
} from "@/lib/safekey-document-catalog";
import { buildSafeKeyScoreboard } from "@/lib/safekey-scoreboard";
import { useLocale, useT } from "@/lib/i18n/context";
import { translate } from "@/lib/i18n/messages";
import { getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";

const initialState: ActionState = {};

export function TenantUploadForm({
  alreadyUploadedTypes,
  requestedDocuments,
  tenantName,
  token,
}: {
  alreadyUploadedTypes: string[];
  requestedDocuments: string[];
  tenantName: string;
  token: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useT();
  const formatMessage = (key: string, vars?: Record<string, string | number>) => {
    let value = translate(locale, key);
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }
    return value;
  };
  const action = uploadDocumentsAction.bind(null, token);
  const [state, formAction] = useActionState(action, initialState);
  const [selectedFilesByType, setSelectedFilesByType] = useState<Record<string, number>>({});

  const uploadedSet = useMemo(
    () => getUploadedDocumentTypes(alreadyUploadedTypes.map((document_type) => ({ document_type }))),
    [alreadyUploadedTypes],
  );
  const pendingDocumentTypes = useMemo(
    () =>
      getPendingUploadDocumentTypes(
        requestedDocuments,
        alreadyUploadedTypes.map((document_type) => ({ document_type })),
      ),
    [alreadyUploadedTypes, requestedDocuments],
  );
  const scoreboardPreview = useMemo(
    () =>
      buildSafeKeyScoreboard({
        requested_documents: requestedDocuments,
        status: "pending_upload",
        tenant_documents: alreadyUploadedTypes.map((document_type) => ({ document_type })),
      }),
    [alreadyUploadedTypes, requestedDocuments],
  );
  const pendingSlots = useMemo(() => {
    const slots = buildRequiredSlots(requestedDocuments);
    return slots.filter((slot) => !isRequiredSlotReceived(slot, uploadedSet));
  }, [requestedDocuments, uploadedSet]);

  function slotHasSessionSelection(slot: (typeof pendingSlots)[number]) {
    return getSlotDocumentTypes(slot).some(
      (documentType) => (selectedFilesByType[documentType] ?? 0) > 0,
    );
  }

  const sessionSelectedSlotCount = pendingSlots.filter((slot) => slotHasSessionSelection(slot)).length;
  const receivedCount = scoreboardPreview.received + sessionSelectedSlotCount;
  const totalCount = scoreboardPreview.total;
  const canSaveProgress =
    pendingSlots.length > 0 && pendingSlots.some((slot) => slotHasSessionSelection(slot));
  const canSubmit =
    pendingSlots.length > 0 &&
    pendingSlots.every(
      (slot) => isRequiredSlotReceived(slot, uploadedSet) || slotHasSessionSelection(slot),
    );
  const applicationComplete = isDocumentSubmissionComplete(
    requestedDocuments,
    uploadedSet,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  if (applicationComplete) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-950">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">{t("tenantUpload.applicationCompleteTitle")}</p>
            <p className="leading-6">{t("tenantUpload.applicationCompleteBody")}</p>
            <p className="font-medium">
              {formatMessage("tenantUpload.documentsProgress", { received: totalCount, total: totalCount })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">{t("tenantUpload.formStepsTitle")}</p>
        <p>{t("tenantUpload.formStepsBody")}</p>
        <p className="mt-2 font-semibold text-slate-900">
          {formatMessage("tenantUpload.documentsProgress", { received: receivedCount, total: totalCount })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.fullName")}</span>
          <input className="input" defaultValue={tenantName} name="full_name" required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.email")}</span>
          <input className="input" name="email" required type="email" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.phone")}</span>
          <input className="input" name="phone" required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.currentAddress")}</span>
          <input className="input" name="current_address" required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.employmentStatus")}</span>
          <select className="input" name="employment_status" required>
            <option value="">{t("tenantUpload.employmentSelect")}</option>
            <option value="full_time">{t("tenantUpload.employmentFullTime")}</option>
            <option value="part_time">{t("tenantUpload.employmentPartTime")}</option>
            <option value="self_employed">{t("tenantUpload.employmentSelfEmployed")}</option>
            <option value="student">{t("tenantUpload.employmentStudent")}</option>
            <option value="retired">{t("tenantUpload.employmentRetired")}</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.employerName")}</span>
          <input className="input" name="employer_name" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.monthlyIncome")}</span>
          <input className="input" min="1" name="monthly_income" required type="number" />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("tenantUpload.moveInDate")}</span>
        <input className="input" name="move_in_date" type="date" />
      </label>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t("tenantUpload.requestedDocumentsSection")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("tenantUpload.requestedDocumentsHint")}</p>
        </div>

        <div className="space-y-3">
          {requestedDocuments.map((documentType) => {
            const alreadyUploaded = uploadedSet.has(documentType);
            const isPending = pendingDocumentTypes.includes(documentType);
            const selectedCount = selectedFilesByType[documentType] ?? 0;
            const fieldName = getDocumentUploadFieldName(documentType);

            return (
              <div
                className={`rounded-2xl border px-4 py-4 ${
                  alreadyUploaded ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
                }`}
                key={documentType}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {getLocalizedDocumentLabel(locale, documentType)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {alreadyUploaded
                        ? t("tenantUpload.documentAlreadyUploaded")
                        : selectedCount > 0
                          ? formatMessage("tenantUpload.filesSelected", { count: selectedCount })
                          : t("tenantUpload.documentUploadRequired")}
                    </p>
                  </div>
                  {alreadyUploaded ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {t("tenantUpload.documentReceived")}
                    </span>
                  ) : null}
                </div>

                {!alreadyUploaded && isPending ? (
                  <label className="mt-3 block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                      {t("tenantUpload.uploadForCategory")}
                    </span>
                    <input
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json"
                      className="input file:mb-3 file:mr-0 file:block file:w-full file:rounded-full file:border-0 file:bg-[#0f2343] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white sm:file:mb-0 sm:file:mr-4 sm:file:inline-block sm:file:w-auto"
                      multiple
                      name={fieldName}
                      onChange={(event) =>
                        setSelectedFilesByType((current) => ({
                          ...current,
                          [documentType]: event.currentTarget.files?.length ?? 0,
                        }))
                      }
                      type="file"
                    />
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("tenantUpload.reviewerNotes")}</span>
        <textarea
          className="input min-h-28"
          name="notes"
          placeholder={t("tenantUpload.reviewerNotesPlaceholder")}
        />
      </label>

      {!canSubmit && canSaveProgress ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {t("tenantUpload.saveProgressHint")}
        </p>
      ) : null}

      {!canSubmit ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          {formatMessage("tenantUpload.submitIncompleteHint", {
            missing: totalCount - receivedCount,
          })}
        </p>
      ) : null}

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <input className="mt-1" name="consent_confirmed" required type="checkbox" />
        <span>
          {t("tenantUpload.consentLabel")}{" "}
          <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href="/privacy">
            {t("tenantUpload.privacyPolicy")}
          </Link>{" "}
          {t("tenantUpload.consentAnd")}{" "}
          <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href="/terms">
            {t("tenantUpload.terms")}
          </Link>
          , {t("tenantUpload.consentGdpr")}
        </span>
      </label>

      <FormStatusMessage state={state} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton
          disabled={!canSaveProgress}
          name="upload_intent"
          pendingLabel={t("tenantUpload.savingProgress")}
          value="save_progress"
          variant="secondary"
        >
          {t("tenantUpload.saveProgress")}
        </SubmitButton>
        <SubmitButton
          disabled={!canSubmit}
          name="upload_intent"
          pendingLabel={t("tenantUpload.submittingApplication")}
          value="submit_complete"
        >
          {t("tenantUpload.submitApplication")}
        </SubmitButton>
      </div>
    </form>
  );
}
