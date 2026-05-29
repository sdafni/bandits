"use client";

import { useT } from "@/lib/i18n/context";
import type { NewCheckDraft } from "@/lib/new-check-draft";
import { getDraftSummaryLabel } from "@/lib/new-check-draft";

export function NewCheckDraftGate({
  draft,
  onContinueDraft,
  onDeleteDraft,
  onStartNew,
}: {
  draft: NewCheckDraft;
  onContinueDraft: () => void;
  onDeleteDraft: () => void;
  onStartNew: () => void;
}) {
  const t = useT();
  const summary = getDraftSummaryLabel(draft);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
        <h2 className="text-base font-semibold text-slate-950">{t("newCheckFlow.unfinishedTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{t("newCheckFlow.unfinishedBody")}</p>
        {summary ? (
          <p className="mt-2 text-sm font-medium text-slate-900">{summary}</p>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-slate-600">{t("newCheckFlow.unfinishedHint")}</p>
      </div>

      <div className="grid gap-2">
        <button className="workspace-cta min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold" onClick={onContinueDraft} type="button">
          {t("newCheckFlow.continueDraft")}
        </button>
        <button
          className="workspace-cta-secondary min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold"
          onClick={onStartNew}
          type="button"
        >
          {t("newCheckFlow.startNew")}
        </button>
        <button
          className="min-h-12 w-full rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800"
          onClick={onDeleteDraft}
          type="button"
        >
          {t("newCheckFlow.deleteDraft")}
        </button>
      </div>
    </div>
  );
}
