"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import {
  addReviewerNoteAction,
  recordLandlordDecisionAction,
  reviewDocumentAction,
  updateDocumentRequirementsAction,
  waiveDocumentRequirementAction,
} from "@/app/actions/safekey-core";
import { TenantDocumentStatusBadge } from "@/components/tenant-document-status";
import { normalizeDocumentReviewStatus } from "@/lib/document-review";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { useLocale, useT } from "@/lib/i18n/context";
import {
  getDefaultDocumentRequirementPriority,
  SAFEKEY_DOCUMENT_CATEGORIES,
  SAFEKEY_DOCUMENT_DEFINITIONS,
  type DocumentPriority,
} from "@/lib/safekey-document-catalog";
import type { CaseReviewerNote, SafeKeyCoreContext, TenantSummaryCard } from "@/lib/safekey-core";
import { resolveCheckDocumentPlan } from "@/lib/safekey-document-plan";
import { getLocalizedDocumentCategoryLabel, getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";
import { formatDate } from "@/lib/utils";

const initialState: ActionState = {};

type DocumentRow = {
  created_at?: string | null;
  document_type: string;
  file_name: string;
  id: string;
  rejection_reason?: string | null;
  review_note?: string | null;
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
  documentRequirements,
  documents,
  notes,
  requestedDocuments,
  summary,
}: {
  asAdmin?: boolean;
  checkId: string;
  context: SafeKeyCoreContext;
  documentRequirements?: unknown;
  documents: DocumentRow[];
  notes: CaseReviewerNote[];
  requestedDocuments: string[];
  summary: TenantSummaryCard;
}) {
  const { locale } = useLocale();
  const t = useT();
  const documentPlan = resolveCheckDocumentPlan({
    document_requirements: documentRequirements,
    requested_documents: requestedDocuments,
  });
  const requirementsByType = new Map(
    documentPlan.requirements.map((requirement) => [requirement.documentType, requirement.priority]),
  );
  const updateRequirementsAction = updateDocumentRequirementsAction.bind(null, checkId);
  const reviewAction = reviewDocumentAction.bind(null, checkId);
  const noteAction = addReviewerNoteAction.bind(null, checkId);
  const decisionAction = recordLandlordDecisionAction.bind(null, checkId);
  const [requirementsState, requirementsFormAction] = useActionState(updateRequirementsAction, initialState);
  const [reviewState, reviewFormAction] = useActionState(reviewAction, initialState);
  const [waiveState, waiveFormAction] = useActionState(
    waiveDocumentRequirementAction.bind(null, checkId),
    initialState,
  );
  const [noteState, noteFormAction] = useActionState(noteAction, initialState);
  const [decisionState, decisionFormAction] = useActionState(decisionAction, initialState);

  const sortedDocuments = [...documents].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
  const priorityOptions: DocumentPriority[] = ["required", "recommended", "optional"];
  const reviewStatuses = ["accepted", "rejected", "needs_replacement", "not_requested"] as const;

  return (
    <div className="space-y-6">
      <TenantSummaryCardPanel summary={summary} />

      {context.canManageDocuments ? (
        <section className="card space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
              {t("safekeyCore.manageDocumentsTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("safekeyCore.manageDocumentsBody")}</p>
          </div>
          <form action={requirementsFormAction} className="space-y-4">
            {asAdmin ? <input name="as_admin" type="hidden" value="on" /> : null}
            {(Object.keys(SAFEKEY_DOCUMENT_CATEGORIES) as Array<keyof typeof SAFEKEY_DOCUMENT_CATEGORIES>).map(
              (category) => (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" key={category}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                    {getLocalizedDocumentCategoryLabel(locale, category)}
                  </p>
                  <div className="space-y-2">
                    {SAFEKEY_DOCUMENT_DEFINITIONS.filter((item) => item.category === category).map((item) => {
                      const currentPriority = requirementsByType.get(item.value);
                      const defaultPriority = getDefaultDocumentRequirementPriority(item.value);

                      return (
                        <div
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          key={item.value}
                        >
                          <label className="flex min-w-[180px] flex-1 items-center gap-2">
                            <input
                              defaultChecked={Boolean(currentPriority)}
                              name="document_types"
                              type="checkbox"
                              value={item.value}
                            />
                            <span>{getLocalizedDocumentLabel(locale, item.value)}</span>
                          </label>
                          <select
                            className="input max-w-[160px] py-2 text-sm"
                            defaultValue={currentPriority ?? defaultPriority}
                            name={`priority_${item.value}`}
                          >
                            {priorityOptions.map((priority) => (
                              <option key={priority} value={priority}>
                                {t(`documents.priority.${priority}`)}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("safekeyCore.requestMessage")}</span>
              <textarea className="input min-h-24" name="message" placeholder={t("safekeyCore.manageDocumentsMessagePlaceholder")} />
            </label>
            <FormStatusMessage state={requirementsState} />
            <SubmitButton pendingLabel={t("safekeyCore.savingRequirements")}>
              {t("safekeyCore.manageDocumentsCta")}
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {context.canReviewDocuments ? (
        <section className="card space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
              {t("safekeyCore.reviewTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("safekeyCore.reviewBody")}</p>
          </div>
          {sortedDocuments.length === 0 ? (
            <p className="text-sm text-slate-500">{t("tenantUpload.noDocuments")}</p>
          ) : (
            <ul className="space-y-4">
              {sortedDocuments.map((document) => {
                const status = normalizeDocumentReviewStatus(document.upload_status);
                return (
                  <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={document.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {getLocalizedDocumentLabel(locale, document.document_type)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{document.file_name}</p>
                      </div>
                      <TenantDocumentStatusBadge locale={locale} status={status} />
                    </div>
                    <form action={reviewFormAction} className="mt-4 space-y-3">
                      {asAdmin ? <input name="as_admin" type="hidden" value="on" /> : null}
                      <input name="document_id" type="hidden" value={document.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {reviewStatuses.map((reviewStatus) => (
                          <label
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            key={reviewStatus}
                          >
                            <input
                              className="mr-2"
                              defaultChecked={status === reviewStatus}
                              name="review_status"
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
                          placeholder={t("safekeyCore.reviewNotePlaceholder")}
                        />
                      </label>
                      <SubmitButton pendingLabel={t("safekeyCore.reviewing")}>
                        {t("safekeyCore.reviewCta")}
                      </SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
          <FormStatusMessage state={reviewState} />
        </section>
      ) : null}

      {context.canManageDocuments ? (
        <section className="card space-y-3">
          <p className="text-sm font-semibold text-slate-900">{t("safekeyCore.waiveRequirement")}</p>
          <ul className="space-y-2">
            {documentPlan.requirements
              .filter((requirement) => requirement.priority === "required")
              .map((requirement) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  key={requirement.documentType}
                >
                  <span>{getLocalizedDocumentLabel(locale, requirement.documentType)}</span>
                  <form action={waiveFormAction}>
                    {asAdmin ? <input name="as_admin" type="hidden" value="on" /> : null}
                    <input name="document_type" type="hidden" value={requirement.documentType} />
                    {requirement.waived ? (
                      <SubmitButton pendingLabel={t("safekeyCore.reviewing")}>
                        {t("safekeyCore.unwaiveRequirementCta")}
                      </SubmitButton>
                    ) : (
                      <>
                        <input name="waived" type="hidden" value="on" />
                        <SubmitButton pendingLabel={t("safekeyCore.reviewing")}>
                          {t("safekeyCore.waiveRequirementCta")}
                        </SubmitButton>
                      </>
                    )}
                  </form>
                </li>
              ))}
          </ul>
          <FormStatusMessage state={waiveState} />
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
