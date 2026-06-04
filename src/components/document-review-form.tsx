"use client";

import { useActionState, useRef } from "react";
import type { ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { TenantDocumentStatusBadge } from "@/components/tenant-document-status";
import { getDocumentDisplayStatus } from "@/lib/document-display-status";
import { useLocale, useT } from "@/lib/i18n/context";
import { getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";

type ReviewAction = (prevState: ActionState, formData: FormData) => Promise<ActionState>;

export function DocumentReviewForm({
  asAdmin = false,
  document,
  reviewAction,
}: {
  asAdmin?: boolean;
  document: {
    document_type: string;
    file_name: string;
    id: string;
    rejection_reason?: string | null;
    review_note?: string | null;
    upload_status: string;
  };
  reviewAction: ReviewAction;
}) {
  const { locale } = useLocale();
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(reviewAction, {});
  const displayStatus = getDocumentDisplayStatus(document);
  const reviewStatuses = ["accepted", "rejected", "needs_replacement"] as const;
  const normalizedStatus =
    document.upload_status === "accepted" ||
    document.upload_status === "rejected" ||
    document.upload_status === "needs_replacement"
      ? document.upload_status
      : "accepted";

  function scheduleSave() {
    formRef.current?.requestSubmit();
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{getLocalizedDocumentLabel(locale, document.document_type)}</p>
          <p className="mt-1 text-sm text-slate-600">{document.file_name}</p>
        </div>
        <TenantDocumentStatusBadge displayStatus={displayStatus} locale={locale} />
      </div>
      <form action={formAction} className="mt-4 space-y-3" ref={formRef}>
        {asAdmin ? <input name="as_admin" type="hidden" value="on" /> : null}
        <input name="document_id" type="hidden" value={document.id} />
        <div className="grid gap-2 sm:grid-cols-3">
          {reviewStatuses.map((reviewStatus) => (
            <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" key={reviewStatus}>
              <input
                className="mr-2"
                defaultChecked={normalizedStatus === reviewStatus}
                name="review_status"
                onChange={scheduleSave}
                required
                type="radio"
                value={reviewStatus}
              />
              {t(`safekeyCore.reviewStatus.${reviewStatus}`)}
            </label>
          ))}
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("safekeyCore.reviewNote")}</span>
          <textarea
            className="input min-h-20"
            defaultValue={document.review_note ?? document.rejection_reason ?? ""}
            name="note"
            onBlur={scheduleSave}
            placeholder={t("safekeyCore.reviewNotePlaceholder")}
          />
        </label>
        {isPending ? <p className="text-xs text-slate-500">{t("safekeyCore.reviewing")}</p> : null}
        <FormStatusMessage state={state} />
      </form>
    </li>
  );
}
