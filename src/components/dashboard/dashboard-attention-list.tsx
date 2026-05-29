"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardCheck } from "@/lib/dashboard-tier";
import type { AppLocale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

function CaseRow({ check, locale }: { check: DashboardCheck; locale: AppLocale }) {
  return (
    <li>
      <Link
        className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50"
        href={withLocalePath(locale, `/dashboard/checks/${check.id}`)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{check.tenant_full_name}</p>
          <p className="truncate text-xs text-slate-500">{check.properties?.name ?? "—"}</p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </Link>
    </li>
  );
}

export function DashboardAttentionList({ checks }: { checks: DashboardCheck[] }) {
  const t = useT();
  const { locale } = useLocale();

  const awaiting = checks.filter((check) => check.status === "pending_upload");
  const inReview = checks.filter(
    (check) => check.status === "documents_received" || check.status === "under_review",
  );
  const ready = checks.filter((check) => check.status === "report_ready").slice(0, 5);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-slate-900">{t("dashboard.attentionTitle")}</p>
      <p className="mt-1 text-xs text-slate-500">{t("dashboard.attentionSubtitle")}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-slate-600">{t("dashboard.attentionAwaiting")}</p>
          <ul className="mt-2 space-y-1">
            {awaiting.length === 0 ? (
              <li className="text-xs text-slate-500">{t("dashboard.attentionNone")}</li>
            ) : (
              awaiting.slice(0, 4).map((check) => <CaseRow check={check} key={check.id} locale={locale} />)
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600">{t("dashboard.attentionReview")}</p>
          <ul className="mt-2 space-y-1">
            {inReview.length === 0 ? (
              <li className="text-xs text-slate-500">{t("dashboard.attentionNone")}</li>
            ) : (
              inReview.slice(0, 4).map((check) => <CaseRow check={check} key={check.id} locale={locale} />)
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600">{t("dashboard.attentionReady")}</p>
          <ul className="mt-2 space-y-1">
            {ready.length === 0 ? (
              <li className="text-xs text-slate-500">{t("dashboard.attentionNone")}</li>
            ) : (
              ready.map((check) => <CaseRow check={check} key={check.id} locale={locale} />)
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
