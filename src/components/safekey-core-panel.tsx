"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import {
  addReviewerNoteAction,
  recordLandlordDecisionAction,
  rejectDocumentAction,
  requestMissingDocumentsAction,
} from "@/app/actions/safekey-core";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { useLocale, useT } from "@/lib/i18n/context";
import { SAFEKEY_DOCUMENT_DEFINITIONS } from "@/lib/safekey-document-catalog";
import type { CaseReviewerNote, SafeKeyCoreContext, TenantSummaryCard } from "@/lib/safekey-core";
import { getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";
import { formatDate } from "@/lib/utils";

const initialState: ActionState = {};

type DocumentRow = {
  document_type: string;
  file_name: string;
  id: string;
  rejection_reason?: string | null;
  upload_status: string;
};

export function TenantSummaryCardPanel({ summary }: { summary: TenantSummaryCard }) {
  const t = useT();

  return (
    <section className="card space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("safekeyCore.summaryKicker")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{summary.tenantName}</h2>
        <p className="mt-1 text-sm text-slate-600">{summary.propertyName}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("safekeyCore.completion")}</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{summary.completionPercent}%</p>
          <p className="text-sm text-slate-600">{t(`scoreboard.trustLevel.${summary.trustLevel}`)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("safekeyCore.reportScore")}</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {summary.reportScore != null ? `${summary.reportScore}/100` : "—"}
          </p>
          <p className="text-sm capitalize text-slate-600">{summary.reportRecommendation ?? t("safekeyCore.reportPending")}</p>
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">{t("safekeyCore.email")}</dt>
          <dd className="font-medium text-slate-900">{summary.tenantEmail ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t("safekeyCore.phone")}</dt>
          <dd className="font-medium text-slate-900">{summary.tenantPhone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t("safekeyCore.income")}</dt>
          <dd className="font-medium text-slate-900">{summary.monthlyIncome ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t("safekeyCore.rent")}</dt>
          <dd className="font-medium text-slate-900">{summary.monthlyRent ?? "—"}</dd>
        </div>
      </dl>

      {summary.missingCategories.length > 0 ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("safekeyCore.missingCategories")}: {summary.missingCategories.join(", ")}
        </p>
      ) : null}
    </section>
  );
}

export function SafeKeyCoreWorkflowPanel({
  asAdmin = false,
  checkId,
  context,
  documents,
  missingDocumentTypes,
  notes,
  summary,
}: {
  asAdmin?: boolean;
  checkId: string;
  context: SafeKeyCoreContext;
  documents: DocumentRow[];
  missingDocumentTypes: string[];
  notes: CaseReviewerNote[];
  summary: TenantSummaryCard;
}) {
  const { locale } = useLocale();
  const t = useT();
  const requestAction = requestMissingDocumentsAction.bind(null, checkId);
  const rejectAction = rejectDocumentAction.bind(null, checkId);
  const noteAction = addReviewerNoteAction.bind(null, checkId);
  const decisionAction = recordLandlordDecisionAction.bind(null, checkId);
  const [requestState, requestFormAction] = useActionState(requestAction, initialState);
  const [rejectState, rejectFormAction] = useActionState(rejectAction, initialState);
  const [noteState, noteFormAction] = useActionState(noteAction, initialState);
  const [decisionState, decisionFormAction] = useActionState(decisionAction, initialState);

  const requestableDocuments = SAFEKEY_DOCUMENT_DEFINITIONS.filter(
    (item) => !summary.scoreboard.receivedDocumentTypes.includes(item.value),
  );
  const rejectableDocuments = documents.filter((document) => document.upload_status !== "rejected");

  return (
    <div className="space-y-6">
      <TenantSummaryCardPanel summary={summary} />

      {context.canManageDocuments ? (
        <section className="card space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
              {t("safekeyCore.requestMissingTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("safekeyCore.requestMissingBody")}</p>
          </div>
          <form action={requestFormAction} className="space-y-4">
            {asAdmin ? <input name="as_admin" type="hidden" value="on" /> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {(requestableDocuments.length > 0 ? requestableDocuments : SAFEKEY_DOCUMENT_DEFINITIONS).map((item) => (
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm" key={item.value}>
                  <input defaultChecked={missingDocumentTypes.includes(item.value)} name="document_types" type="checkbox" value={item.value} />
                  <span>{getLocalizedDocumentLabel(locale, item.value)}</span>
                </label>
              ))}
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("safekeyCore.requestMessage")}</span>
              <textarea className="input min-h-24" name="message" placeholder={t("safekeyCore.requestMessagePlaceholder")} />
            </label>
            <FormStatusMessage state={requestState} />
            <SubmitButton pendingLabel={t("safekeyCore.requesting")}>{t("safekeyCore.requestMissingCta")}</SubmitButton>
          </form>
        </section>
      ) : null}

      {context.canRejectDocuments ? (
        <section className="card space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
              {t("safekeyCore.rejectTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("safekeyCore.rejectBody")}</p>
          </div>
          <form action={rejectFormAction} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("safekeyCore.rejectDocument")}</span>
              <select className="input" name="document_id" required>
                <option value="">{t("safekeyCore.rejectSelect")}</option>
                {rejectableDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {getLocalizedDocumentLabel(locale, document.document_type)} · {document.file_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("safekeyCore.rejectReason")}</span>
              <textarea className="input min-h-24" name="reason" required />
            </label>
            <FormStatusMessage state={rejectState} />
            <SubmitButton pendingLabel={t("safekeyCore.rejecting")}>{t("safekeyCore.rejectCta")}</SubmitButton>
          </form>
        </section>
      ) : null}

      {context.canWriteReviewerNotes ? (
        <section className="card space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{t("safekeyCore.notesTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("safekeyCore.notesBody")}</p>
          </div>
          <form action={noteFormAction} className="space-y-4">
            {asAdmin ? <input name="as_admin" type="hidden" value="on" /> : null}
            <textarea className="input min-h-28" name="body" placeholder={t("safekeyCore.notesPlaceholder")} required />
            <FormStatusMessage state={noteState} />
            <SubmitButton pendingLabel={t("safekeyCore.savingNote")}>{t("safekeyCore.notesCta")}</SubmitButton>
          </form>
          {notes.length > 0 ? (
            <ul className="space-y-3 border-t border-slate-100 pt-4">
              {notes.map((note) => (
                <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" key={note.id}>
                  <p className="font-medium capitalize text-slate-900">{note.authorRole}</p>
                  <p className="mt-1 leading-6 text-slate-700">{note.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(note.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{t("safekeyCore.notesEmpty")}</p>
          )}
        </section>
      ) : null}

      {context.canRecordDecision ? (
        <section className="card space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
              {t("safekeyCore.decisionTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("safekeyCore.decisionBody")}</p>
            {summary.landlordDecision !== "pending" ? (
              <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {t("safekeyCore.decisionRecorded")}: {summary.landlordDecision}
              </p>
            ) : null}
          </div>
          <form action={decisionFormAction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["approved", "conditional", "declined"] as const).map((decision) => (
                <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" key={decision}>
                  <input className="mr-2" name="decision" required type="radio" value={decision} />
                  {t(`safekeyCore.decision.${decision}`)}
                </label>
              ))}
            </div>
            <textarea className="input min-h-24" name="notes" placeholder={t("safekeyCore.decisionNotesPlaceholder")} />
            <FormStatusMessage state={decisionState} />
            <SubmitButton pendingLabel={t("safekeyCore.recordingDecision")}>{t("safekeyCore.decisionCta")}</SubmitButton>
          </form>
        </section>
      ) : null}
    </div>
  );
}
