import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";
import {
  getDocumentDisplayStatus,
  getDocumentDisplayStatusMessageKey,
  mapReviewStatusToDisplay,
  type DocumentDisplayStatus,
} from "@/lib/document-display-status";
import {
  getDocumentReviewNote,
  normalizeDocumentReviewStatus,
  type DocumentReviewStatus,
} from "@/lib/document-review";
import { getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";

export type TenantDocumentStatusRow = {
  created_at?: string | null;
  document_type: string;
  file_name?: string | null;
  review_note?: string | null;
  rejection_reason?: string | null;
  upload_status?: string | null;
};

const DISPLAY_TONE: Record<DocumentDisplayStatus, string> = {
  approved: "bg-emerald-100 text-emerald-900",
  uploaded: "bg-sky-100 text-sky-900",
  under_review: "bg-sky-100 text-sky-900",
  replacement_requested: "bg-rose-100 text-rose-900",
  rejected: "bg-rose-100 text-rose-900",
  waived: "bg-emerald-100 text-emerald-900",
  missing: "bg-amber-100 text-amber-950",
};

function StatusIcon({ status }: { status: DocumentDisplayStatus }) {
  if (status === "approved" || status === "waived") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  }

  if (status === "uploaded" || status === "under_review") {
    return <Clock3 className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />;
  }

  if (status === "missing") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />;
  }

  return <XCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />;
}

export function TenantDocumentStatusBadge({
  displayStatus,
  locale,
  status,
}: {
  displayStatus?: DocumentDisplayStatus;
  locale: AppLocale;
  status?: DocumentReviewStatus;
}) {
  const resolved =
    displayStatus ?? (status ? mapReviewStatusToDisplay(status) : "missing");
  const label = translate(locale, getDocumentDisplayStatusMessageKey(resolved));

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${DISPLAY_TONE[resolved]}`}
    >
      <StatusIcon status={resolved} />
      {label}
    </span>
  );
}

export function TenantDocumentStatusList({
  documents,
  locale,
}: {
  documents: TenantDocumentStatusRow[];
  locale: AppLocale;
}) {
  const t = (key: string, vars?: Record<string, string>) => {
    let value = translate(locale, key);
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replace(`{${name}}`, replacement);
      }
    }
    return value;
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {documents.map((document, index) => {
        const reviewStatus = normalizeDocumentReviewStatus(document.upload_status);
        const displayStatus = getDocumentDisplayStatus(document);
        const note = getDocumentReviewNote(document);
        const categoryLabel = getLocalizedDocumentLabel(locale, document.document_type);

        return (
          <li
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            key={`${document.document_type}-${document.file_name ?? index}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{document.file_name ?? categoryLabel}</p>
                <p className="mt-0.5 text-xs text-slate-600">{categoryLabel}</p>
              </div>
              <TenantDocumentStatusBadge displayStatus={displayStatus} locale={locale} />
            </div>
            {displayStatus === "replacement_requested" || displayStatus === "rejected" ? (
              <p className="mt-2 text-xs leading-5 text-rose-900">
                {t("tenantUpload.replacementPrompt", { category: categoryLabel })}
              </p>
            ) : null}
            {note ? <p className="mt-2 text-xs leading-5 text-slate-700">{note}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
