import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";
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

const STATUS_TONE: Record<DocumentReviewStatus, string> = {
  accepted: "bg-emerald-100 text-emerald-900",
  rejected: "bg-rose-100 text-rose-900",
  needs_replacement: "bg-rose-100 text-rose-900",
  not_requested: "bg-amber-100 text-amber-950",
  pending_review: "bg-sky-100 text-sky-900",
};

function StatusIcon({ status }: { status: DocumentReviewStatus }) {
  if (status === "accepted") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  }

  if (status === "pending_review") {
    return <Clock3 className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />;
  }

  if (status === "not_requested") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />;
  }

  return <XCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />;
}

export function TenantDocumentStatusBadge({
  locale,
  status,
}: {
  locale: AppLocale;
  status: DocumentReviewStatus;
}) {
  const label = translate(locale, `tenantUpload.reviewStatus.${status}`);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${STATUS_TONE[status]}`}
    >
      <StatusIcon status={status} />
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
        const status = normalizeDocumentReviewStatus(document.upload_status);
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
              <TenantDocumentStatusBadge locale={locale} status={status} />
            </div>
            {status === "needs_replacement" || status === "rejected" ? (
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
