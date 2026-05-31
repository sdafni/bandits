import { CheckCircle2, CircleDashed } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";
import {
  type SafeKeyScoreboard,
  groupScoreboardItemsByCategory,
} from "@/lib/safekey-scoreboard";
import { TRUST_DOCUMENT_CATEGORIES } from "@/lib/trust-workflows";
import { getLocalizedDocumentLabel } from "@/lib/trust-document-i18n";

export function SafeKeyScoreboardPanel({
  locale,
  scoreboard,
  title,
}: {
  locale: AppLocale;
  scoreboard: SafeKeyScoreboard;
  title?: string;
}) {
  const t = (key: string, vars?: Record<string, string | number>) => {
    let value = translate(locale, key);
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }
    return value;
  };

  const groupedItems = groupScoreboardItemsByCategory(scoreboard.items);
  const progressPercent =
    scoreboard.total > 0 ? Math.round((scoreboard.received / scoreboard.total) * 100) : 0;

  return (
    <div className="space-y-3">
      {title ? <p className="text-sm font-medium text-slate-700">{title}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-slate-900">
            {t("scoreboard.progress", { received: scoreboard.received, total: scoreboard.total })}
          </p>
          <p className="text-slate-600">{progressPercent}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {scoreboard.missing > 0 ? (
          <p className="mt-2 text-xs leading-5 text-amber-900">
            {t("scoreboard.missingSummary", { missing: scoreboard.missing })}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-emerald-800">{t("scoreboard.allReceived")}</p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {groupedItems.map(({ category, items }) => (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3" key={category}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              {TRUST_DOCUMENT_CATEGORIES[category].label}
            </p>
            <ul className="mt-2 space-y-2">
              {items.map((item) => {
                const received = item.status === "received";
                return (
                  <li className="flex items-start gap-2 text-sm" key={item.documentType}>
                    {received ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    )}
                    <span className={received ? "font-medium text-slate-900" : "text-slate-700"}>
                      {getLocalizedDocumentLabel(locale, item.documentType)}
                    </span>
                    <span
                      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                        received
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {received ? t("scoreboard.received") : t("scoreboard.missing")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
