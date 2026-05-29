"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentsAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { useLocale, useT } from "@/lib/i18n/context";
import { getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";
import { TRUST_DOCUMENT_CATEGORIES, TRUST_DOCUMENT_DEFINITIONS } from "@/lib/trust-workflows";

const initialState: ActionState = {};

export function TenantUploadForm({
  token,
  tenantName,
}: {
  token: string;
  tenantName: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useT();
  const action = uploadDocumentsAction.bind(null, token);
  const [state, formAction] = useActionState(action, initialState);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  const selectedDocumentCategory = useMemo(
    () => TRUST_DOCUMENT_DEFINITIONS.find((item) => item.value === selectedDocumentType)?.category ?? null,
    [selectedDocumentType],
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">{t("tenantUpload.formStepsTitle")}</p>
        <p>{t("tenantUpload.formStepsBody")}</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.moveInDate")}</span>
          <input className="input" name="move_in_date" type="date" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("tenantUpload.documentCategory")}</span>
          <select className="input" name="document_type" onChange={(event) => setSelectedDocumentType(event.target.value)} required>
            <option value="">{t("tenantUpload.documentCategorySelect")}</option>
            {TRUST_DOCUMENT_DEFINITIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {getLocalizedDocumentLabel(locale, option.value)} ({option.priority})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <p>
          {t("tenantUpload.categorySummary")}:{" "}
          {selectedDocumentCategory
            ? TRUST_DOCUMENT_CATEGORIES[selectedDocumentCategory].label
            : t("tenantUpload.categoryNotSelected")}{" "}
          · {t("tenantUpload.filesReady")}: {selectedFilesCount}
        </p>
      </div>

      <p className="text-sm leading-6 text-slate-500">{t("tenantUpload.batchHint")}</p>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("tenantUpload.reviewerNotes")}</span>
        <textarea
          className="input min-h-28"
          name="notes"
          placeholder={t("tenantUpload.reviewerNotesPlaceholder")}
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("tenantUpload.documentNotes")}</span>
        <textarea
          className="input min-h-24"
          name="document_notes"
          placeholder={t("tenantUpload.documentNotesPlaceholder")}
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("tenantUpload.uploadDocuments")}</span>
        <input
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json"
          className="input file:mb-3 file:mr-0 file:block file:w-full file:rounded-full file:border-0 file:bg-[#0f2343] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white sm:file:mb-0 sm:file:mr-4 sm:file:inline-block sm:file:w-auto"
          multiple
          name="documents"
          onChange={(event) => setSelectedFilesCount(event.currentTarget.files?.length ?? 0)}
          required
          type="file"
        />
      </label>

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
      <SubmitButton pendingLabel={t("tenantUpload.submittingBatch")}>{t("tenantUpload.submitBatch")}</SubmitButton>
    </form>
  );
}
