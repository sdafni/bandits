"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  markCreditReportRequestedAction,
  saveTenantUploadProfileAction,
  submitTenantApplicationAction,
  uploadTenantDocumentAction,
  type TenantUploadActionState,
} from "@/app/actions/tenant-upload";
import { CreditReportGuidancePanel } from "@/components/credit-report-guidance";
import { resolveCreditReportWorkflowStatus } from "@/lib/credit-report";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import {
  getDocumentUploadFieldName,
  isCheckDocumentPlanSubmissionComplete,
} from "@/lib/document-submission";
import {
  CREDIT_REPORT_DOCUMENT_TYPE,
  getPendingUploadDocumentTypesFromRequirements,
  getSlotDocumentTypes,
  getUploadRowsFromRequirements,
  normalizeDocumentType,
  type DocumentPriority,
} from "@/lib/safekey-document-catalog";
import { TenantDocumentStatusBadge } from "@/components/tenant-document-status";
import { getDocumentDisplayStatus, mapSlotStatusToDisplay } from "@/lib/document-display-status";
import {
  getDocumentReviewNote,
  getLatestDocumentsByType,
  normalizeDocumentReviewStatus,
  resolveSlotReviewStatus,
  type SlotReviewStatus,
  type TenantDocumentReviewRow,
} from "@/lib/document-review";
import { buildSafeKeyScoreboard } from "@/lib/safekey-scoreboard";
import type { CheckDocumentPlan } from "@/lib/safekey-document-plan";
import {
  clearTenantUploadDraft,
  mergeTenantUploadProfileDraft,
  readTenantUploadDraft,
  writeTenantUploadDraft,
  type TenantUploadProfileDraft,
} from "@/lib/tenant-upload-draft";
import { useLocale, useT } from "@/lib/i18n/context";
import { translate } from "@/lib/i18n/messages";
import { getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";

const initialState: TenantUploadActionState = {};

const PRIORITY_TONE: Record<DocumentPriority, string> = {
  required: "bg-rose-100 text-rose-900",
  recommended: "bg-amber-100 text-amber-900",
  optional: "bg-slate-100 text-slate-700",
};

function profileFromSavedRow(
  savedProfile: TenantUploadProfileDraft | null,
  tenantName: string,
): TenantUploadProfileDraft {
  return {
    consentConfirmed: savedProfile?.consentConfirmed ?? false,
    creditReportConsent: savedProfile?.creditReportConsent ?? false,
    creditReportRequestedAt: savedProfile?.creditReportRequestedAt ?? null,
    currentAddress: savedProfile?.currentAddress ?? "",
    email: savedProfile?.email ?? "",
    employerName: savedProfile?.employerName ?? "",
    employmentStatus: savedProfile?.employmentStatus ?? "",
    fullName: savedProfile?.fullName ?? tenantName,
    monthlyIncome: savedProfile?.monthlyIncome ?? "",
    moveInDate: savedProfile?.moveInDate ?? "",
    notes: savedProfile?.notes ?? "",
    phone: savedProfile?.phone ?? "",
  };
}

function appendProfileToFormData(formData: FormData, profile: TenantUploadProfileDraft) {
  formData.set("full_name", profile.fullName ?? "");
  formData.set("email", profile.email ?? "");
  formData.set("phone", profile.phone ?? "");
  formData.set("current_address", profile.currentAddress ?? "");
  formData.set("employment_status", profile.employmentStatus ?? "");
  formData.set("employer_name", profile.employerName ?? "");
  formData.set("monthly_income", profile.monthlyIncome ?? "");
  formData.set("move_in_date", profile.moveInDate ?? "");
  formData.set("notes", profile.notes ?? "");
  if (profile.consentConfirmed) {
    formData.set("consent_confirmed", "on");
  }
  if (profile.creditReportConsent) {
    formData.set("credit_report_consent", "on");
  }
}

function DocumentUploadRow({
  canUpload,
  creditReportConsent,
  documentType,
  getProfileSnapshot,
  locale,
  onCreditReportConsentChange,
  onUploaded,
  priority,
  reviewNote,
  row,
  showStatus,
  slotStatus,
  token,
}: {
  canUpload: boolean;
  creditReportConsent: boolean;
  documentType: string;
  getProfileSnapshot: () => TenantUploadProfileDraft;
  locale: ReturnType<typeof useLocale>["locale"];
  onCreditReportConsentChange: (checked: boolean) => void;
  onUploaded: (
    documentType: string,
    payload?: {
      pendingUploadTypes?: string[];
      tenantDocuments?: TenantDocumentReviewRow[];
    },
  ) => void;
  priority: DocumentPriority;
  reviewNote?: string | null;
  row: ReturnType<typeof getUploadRowsFromRequirements>[number];
  showStatus: boolean;
  slotStatus: SlotReviewStatus;
  token: string;
}) {
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
  const uploadAction = uploadTenantDocumentAction.bind(null, token, documentType);
  const [uploadState, uploadFormAction, isUploading] = useActionState(uploadAction, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    if (uploadState.success && uploadState.documentType) {
      onUploaded(uploadState.documentType, {
        pendingUploadTypes: uploadState.pendingUploadTypes,
        tenantDocuments: uploadState.tenantDocuments,
      });
      setSelectedCount(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [
    onUploaded,
    uploadState.documentType,
    uploadState.pendingUploadTypes,
    uploadState.success,
    uploadState.tenantDocuments,
  ]);

  const isCreditReport = normalizeDocumentType(documentType) === CREDIT_REPORT_DOCUMENT_TYPE;
  const creditConsentRequired = isCreditReport && canUpload;

  async function handleUploadSelectedFiles(fileList: FileList | null) {
    if (!fileList?.length || !canUpload) {
      return;
    }

    if (isCreditReport && !creditReportConsent) {
      return;
    }

    const formData = new FormData();
    appendProfileToFormData(formData, getProfileSnapshot());
    for (const file of Array.from(fileList)) {
      formData.append(getDocumentUploadFieldName(documentType), file);
    }

    await uploadFormAction(formData);
  }

  const rowKey = row.slot.kind === "document" ? row.slot.documentType : row.slot.groupId;

  return (
    <div className="mt-3 space-y-2" key={`${rowKey}-${documentType}`}>
      {row.documentTypes.length > 1 ? (
        <span className="text-xs font-medium text-slate-700">{getLocalizedDocumentLabel(locale, documentType)}</span>
      ) : null}
      {showStatus && slotStatus !== "missing" && slotStatus !== "waived" ? (
        <TenantDocumentStatusBadge displayStatus={mapSlotStatusToDisplay(slotStatus)} locale={locale} />
      ) : null}
      {(slotStatus === "needs_replacement") && reviewNote ? (
        <p className="text-xs leading-5 text-rose-900">{reviewNote}</p>
      ) : null}
      {slotStatus === "needs_replacement" ? (
        <p className="text-xs leading-5 text-rose-900">
          {formatMessage("tenantUpload.replacementPrompt", {
            category: getLocalizedDocumentLabel(locale, documentType),
          })}
        </p>
      ) : null}
      {creditConsentRequired ? (
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-700">
          <input
            checked={creditReportConsent}
            className="mt-0.5"
            name="credit_report_consent"
            onChange={(event) => onCreditReportConsentChange(event.target.checked)}
            type="checkbox"
          />
          <span>{t("tenantUpload.creditReportConsent")}</span>
        </label>
      ) : null}
      {canUpload ? (
        <>
          <input
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json"
            className="input file:mb-3 file:mr-0 file:block file:w-full file:rounded-full file:border-0 file:bg-[#0f2343] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white sm:file:mb-0 sm:file:mr-4 sm:file:inline-block sm:file:w-auto"
            disabled={isUploading || (creditConsentRequired && !creditReportConsent)}
            multiple
            name={getDocumentUploadFieldName(documentType)}
            onChange={(event) => {
              const files = event.currentTarget.files;
              setSelectedCount(files?.length ?? 0);
              void handleUploadSelectedFiles(files);
            }}
            ref={fileInputRef}
            type="file"
          />
          {creditConsentRequired && !creditReportConsent ? (
            <p className="text-xs text-amber-900">{t("tenantUpload.creditReportConsentRequired")}</p>
          ) : null}
          {isUploading ? (
            <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t("tenantUpload.uploadingDocument")}
            </p>
          ) : null}
          {uploadState.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              <p>{uploadState.error}</p>
              <button
                className="mt-2 font-semibold underline"
                onClick={() => void handleUploadSelectedFiles(fileInputRef.current?.files ?? null)}
                type="button"
              >
                {t("tenantUpload.retryUpload")}
              </button>
            </div>
          ) : null}
          {uploadState.success && !isUploading ? (
            <p className="text-xs font-medium text-emerald-800">{uploadState.success}</p>
          ) : null}
          {selectedCount > 0 && !isUploading && !uploadState.error ? (
            <p className="text-xs text-slate-600">{formatMessage("tenantUpload.filesSelected", { count: selectedCount })}</p>
          ) : null}
        </>
      ) : null}
      <span className="sr-only">{t(`documents.priority.${priority}`)}</span>
    </div>
  );
}

export function TenantUploadForm({
  checkStatus,
  documentPlan,
  initialTenantDocuments,
  savedProfile,
  tenantName,
  token,
}: {
  checkStatus: string;
  documentPlan: CheckDocumentPlan;
  initialTenantDocuments: TenantDocumentReviewRow[];
  savedProfile: TenantUploadProfileDraft | null;
  tenantName: string;
  token: string;
}) {
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();
  const formatMessage = (key: string, vars?: Record<string, string | number>) => {
    let value = translate(locale, key);
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }
    return value;
  };

  const initialProfile = useMemo(
    () =>
      mergeTenantUploadProfileDraft({
        fallbackName: tenantName,
        localDraft: readTenantUploadDraft(token),
        savedProfile: savedProfile ?? profileFromSavedRow(null, tenantName),
      }),
    [savedProfile, tenantName, token],
  );

  const [profile, setProfile] = useState<TenantUploadProfileDraft>(initialProfile);
  const [tenantDocuments, setTenantDocuments] = useState<TenantDocumentReviewRow[]>(initialTenantDocuments);
  const creditReportWorkflowStatus = useMemo(
    () =>
      resolveCreditReportWorkflowStatus({
        creditReportRequestedAt: profile.creditReportRequestedAt,
        tenantDocuments,
      }),
    [profile.creditReportRequestedAt, tenantDocuments],
  );
  const [profileSaveState, setProfileSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileAction = saveTenantUploadProfileAction.bind(null, token);
  const submitAction = submitTenantApplicationAction.bind(null, token);
  const [submitState, submitFormAction] = useActionState(submitAction, initialState);

  const pendingUploadTypes = useMemo(
    () => getPendingUploadDocumentTypesFromRequirements(documentPlan.requirements, tenantDocuments),
    [documentPlan.requirements, tenantDocuments],
  );
  const uploadRows = useMemo(
    () => getUploadRowsFromRequirements(documentPlan.requirements),
    [documentPlan.requirements],
  );
  const scoreboardPreview = useMemo(
    () =>
      buildSafeKeyScoreboard({
        document_requirements: documentPlan.requirements,
        requested_documents: documentPlan.requestedDocuments,
        status: checkStatus,
        tenant_documents: tenantDocuments,
      }),
    [checkStatus, documentPlan, tenantDocuments],
  );
  const canSubmit = scoreboardPreview.submissionReady;
  const applicationComplete =
    checkStatus !== "pending_upload" && isCheckDocumentPlanSubmissionComplete(documentPlan, tenantDocuments);

  const persistProfileDraft = useCallback(
    async (nextProfile: TenantUploadProfileDraft) => {
      writeTenantUploadDraft(token, nextProfile);
      setProfileSaveState("saving");
      setProfileSaveError(null);

      const formData = new FormData();
      appendProfileToFormData(formData, nextProfile);
      const result = await profileAction(initialState, formData);

      if (result.error) {
        setProfileSaveState("error");
        setProfileSaveError(result.error);
        return;
      }

      setProfileSaveState("saved");
    },
    [profileAction, token],
  );

  const scheduleProfileSave = useCallback(
    (nextProfile: TenantUploadProfileDraft) => {
      writeTenantUploadDraft(token, nextProfile);
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
      }

      profileSaveTimerRef.current = setTimeout(() => {
        void persistProfileDraft(nextProfile);
      }, 350);
    },
    [persistProfileDraft, token],
  );

  const flushProfileSave = useCallback(() => {
    if (profileSaveTimerRef.current) {
      clearTimeout(profileSaveTimerRef.current);
      profileSaveTimerRef.current = null;
    }

    void persistProfileDraft(profile);
  }, [persistProfileDraft, profile]);

  function updateProfile<K extends keyof TenantUploadProfileDraft>(key: K, value: TenantUploadProfileDraft[K]) {
    setProfile((current) => {
      const next = { ...current, [key]: value };
      scheduleProfileSave(next);
      return next;
    });
  }

  const getProfileSnapshot = useCallback(() => profile, [profile]);

  const handleCreditReportRequested = useCallback(async () => {
    const result = await markCreditReportRequestedAction(token);
    if (!result.error) {
      const requestedAt = profile.creditReportRequestedAt ?? new Date().toISOString();
      const nextProfile = { ...profile, creditReportRequestedAt: requestedAt };
      setProfile(nextProfile);
      writeTenantUploadDraft(token, nextProfile);
    }
  }, [profile, token]);

  const handleDocumentUploaded = useCallback(
    (
      documentType: string,
      payload?: { pendingUploadTypes?: string[]; tenantDocuments?: TenantDocumentReviewRow[] },
    ) => {
      if (payload?.tenantDocuments?.length) {
        setTenantDocuments(payload.tenantDocuments);
        return;
      }

      setTenantDocuments((current) => [
        ...current,
        {
          created_at: new Date().toISOString(),
          document_type: documentType,
          upload_status: "pending_review",
        },
      ]);
    },
    [],
  );

  useEffect(() => {
    setTenantDocuments(initialTenantDocuments);
  }, [initialTenantDocuments]);

  useEffect(() => {
    if (!savedProfile) {
      return;
    }

    setProfile((current) => {
      const merged = mergeTenantUploadProfileDraft({
        fallbackName: tenantName,
        localDraft: current,
        savedProfile,
      });
      return JSON.stringify(merged) === JSON.stringify(current) ? current : merged;
    });
  }, [savedProfile, tenantName]);

  useEffect(() => {
    writeTenantUploadDraft(token, profile);
  }, [profile, token]);

  useEffect(() => {
    function handlePageHide() {
      writeTenantUploadDraft(token, profile);
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
      void persistProfileDraft(profile);
    }

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [persistProfileDraft, profile, token]);

  useEffect(() => {
    if (!submitState.success) {
      return;
    }

    clearTenantUploadDraft(token);
    router.refresh();
  }, [router, submitState.success, token]);

  useEffect(() => {
    return () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
      }
    };
  }, []);

  if (applicationComplete) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-950">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">{t("tenantUpload.applicationCompleteTitle")}</p>
            <p className="leading-6">{t("tenantUpload.applicationCompleteBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">{t("tenantUpload.formStepsTitle")}</p>
        <p>{t("tenantUpload.formStepsBody")}</p>
        <p className="mt-2 font-semibold text-slate-900">
          {formatMessage("tenantUpload.requiredProgress", {
            received: scoreboardPreview.requiredReceived,
            total: scoreboardPreview.requiredTotal,
          })}
        </p>
        {profileSaveState === "saving" ? (
          <p className="mt-1 text-xs text-slate-600">{t("tenantUpload.profileSaving")}</p>
        ) : null}
        {profileSaveState === "saved" ? (
          <p className="mt-1 text-xs text-emerald-800">{t("tenantUpload.profileSaved")}</p>
        ) : null}
        {profileSaveError ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-800">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            {profileSaveError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.fullName")}</span>
          <input
            className="input"
            name="full_name"
            onBlur={flushProfileSave}
            onChange={(event) => updateProfile("fullName", event.target.value)}
            required
            value={profile.fullName ?? ""}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.email")}</span>
          <input
            className="input"
            name="email"
            onBlur={flushProfileSave}
            onChange={(event) => updateProfile("email", event.target.value)}
            required
            type="email"
            value={profile.email ?? ""}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.phone")}</span>
          <input
            className="input"
            name="phone"
            onBlur={flushProfileSave}
            onChange={(event) => updateProfile("phone", event.target.value)}
            required
            value={profile.phone ?? ""}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.currentAddress")}</span>
          <input
            className="input"
            name="current_address"
            onBlur={flushProfileSave}
            onChange={(event) => updateProfile("currentAddress", event.target.value)}
            required
            value={profile.currentAddress ?? ""}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.employmentStatus")}</span>
          <select
            className="input"
            name="employment_status"
            onBlur={flushProfileSave}
            onChange={(event) => updateProfile("employmentStatus", event.target.value)}
            required
            value={profile.employmentStatus ?? ""}
          >
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
          <input
            className="input"
            name="employer_name"
            onBlur={flushProfileSave}
            onChange={(event) => updateProfile("employerName", event.target.value)}
            value={profile.employerName ?? ""}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.monthlyIncome")}</span>
          <input
            className="input"
            min="1"
            name="monthly_income"
            onBlur={flushProfileSave}
            onChange={(event) => updateProfile("monthlyIncome", event.target.value)}
            required
            type="number"
            value={profile.monthlyIncome ?? ""}
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("tenantUpload.moveInDate")}</span>
        <input
          className="input"
          name="move_in_date"
          onBlur={flushProfileSave}
          onChange={(event) => updateProfile("moveInDate", event.target.value)}
          type="date"
          value={profile.moveInDate ?? ""}
        />
      </label>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t("tenantUpload.requestedDocumentsSection")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("tenantUpload.requestedDocumentsHint")}</p>
          <p className="mt-1 text-xs text-slate-600">{t("tenantUpload.autoUploadHint")}</p>
        </div>

        <div className="space-y-3">
          {uploadRows.map((row) => {
            const rowKey = row.slot.kind === "document" ? row.slot.documentType : row.slot.groupId;
            const slotStatus = resolveSlotReviewStatus(row.slot, tenantDocuments, {
              waived: documentPlan.requirements
                .filter((requirement) => requirement.waived)
                .some((requirement) =>
                  getSlotDocumentTypes(row.slot).includes(normalizeDocumentType(requirement.documentType)),
                ),
            });
            const rowNeedsUpload = row.documentTypes.some((documentType) =>
              pendingUploadTypes.includes(normalizeDocumentType(documentType)),
            );
            const rowComplete =
              slotStatus === "accepted" || slotStatus === "pending_review" || slotStatus === "waived";
            const isCreditReportRow = row.documentTypes.some(
              (documentType) => normalizeDocumentType(documentType) === CREDIT_REPORT_DOCUMENT_TYPE,
            );

            return (
              <div
                className={`rounded-2xl border px-4 py-4 ${
                  rowComplete && !rowNeedsUpload ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
                }`}
                key={rowKey}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {row.slot.kind === "any_of" && slotStatus === "missing"
                          ? row.label
                          : getLocalizedDocumentLabel(locale, row.documentTypes[0])}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${PRIORITY_TONE[row.priority]}`}
                      >
                        {t(`documents.priority.${row.priority}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {isCreditReportRow
                        ? t("creditReport.optionalHint")
                        : rowComplete && !rowNeedsUpload
                          ? t("tenantUpload.documentAlreadyUploaded")
                          : row.priority === "required"
                            ? t("tenantUpload.documentUploadRequired")
                            : t("tenantUpload.documentUploadOptional")}
                    </p>
                    {row.slot.kind === "any_of" && row.documentTypes.length > 1 && rowNeedsUpload ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {t("tenantUpload.identityOrHint")}:{" "}
                        {row.documentTypes
                          .map((documentType) => getLocalizedDocumentLabel(locale, documentType))
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {rowComplete && !rowNeedsUpload ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {t("tenantUpload.documentReceived")}
                    </span>
                  ) : null}
                </div>

                {isCreditReportRow ? (
                  <div className="mt-3">
                    <CreditReportGuidancePanel
                      onRequestCreditReport={() => void handleCreditReportRequested()}
                      status={creditReportWorkflowStatus}
                    />
                  </div>
                ) : null}

                <div className="mt-3 space-y-3">
                  {row.documentTypes.map((documentType) => {
                    const normalizedType = normalizeDocumentType(documentType);
                    const latest = getLatestDocumentsByType(tenantDocuments).get(normalizedType);
                    const typeStatus = latest
                      ? normalizeDocumentReviewStatus(latest.upload_status)
                      : slotStatus === "missing"
                        ? "pending_review"
                        : slotStatus;
                    const canUpload = pendingUploadTypes.includes(normalizedType);

                    if (!canUpload && !latest) {
                      return null;
                    }

                    return (
                      <DocumentUploadRow
                        canUpload={canUpload}
                        creditReportConsent={profile.creditReportConsent ?? false}
                        documentType={documentType}
                        getProfileSnapshot={getProfileSnapshot}
                        key={`${rowKey}-${documentType}`}
                        locale={locale}
                        onCreditReportConsentChange={(checked) => {
                          const nextProfile = { ...profile, creditReportConsent: checked };
                          setProfile(nextProfile);
                          scheduleProfileSave(nextProfile);
                        }}
                        onUploaded={handleDocumentUploaded}
                        priority={row.priority}
                        reviewNote={latest ? getDocumentReviewNote(latest) : null}
                        row={row}
                        showStatus={Boolean(latest)}
                        slotStatus={
                          canUpload && latest
                            ? "needs_replacement"
                            : typeStatus === "rejected"
                              ? "needs_replacement"
                              : slotStatus
                        }
                        token={token}
                      />
                    );
                  })}
                </div>
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
          onBlur={flushProfileSave}
          onChange={(event) => updateProfile("notes", event.target.value)}
          placeholder={t("tenantUpload.reviewerNotesPlaceholder")}
          value={profile.notes ?? ""}
        />
      </label>

      {!canSubmit ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          {formatMessage("tenantUpload.submitIncompleteHint", {
            missing: Math.max(scoreboardPreview.requiredTotal - scoreboardPreview.requiredReceived, 0),
          })}
        </p>
      ) : scoreboardPreview.missingRecommended > 0 ? (
        <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
          {formatMessage("tenantUpload.submitWithRecommendedMissing", {
            count: scoreboardPreview.missingRecommended,
          })}
        </p>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData();
          appendProfileToFormData(formData, profile);
          if (profile.consentConfirmed) {
            formData.set("consent_confirmed", "on");
          }
          void submitFormAction(formData);
        }}
      >
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          <input
            checked={profile.consentConfirmed ?? false}
            className="mt-1"
            name="consent_confirmed"
            onChange={(event) => updateProfile("consentConfirmed", event.target.checked)}
            required
            type="checkbox"
          />
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

        <FormStatusMessage state={submitState} />
        <SubmitButton
          disabled={!canSubmit}
          pendingLabel={t("tenantUpload.submittingApplication")}
        >
          {t("tenantUpload.submitApplication")}
        </SubmitButton>
      </form>
    </div>
  );
}
