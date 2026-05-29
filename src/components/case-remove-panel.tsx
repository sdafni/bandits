"use client";

import { useRouter } from "next/navigation";
import { DeleteCheckButton } from "@/components/delete-check-button";
import { DashboardToast } from "@/components/dashboard-toast";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";
import { useState } from "react";
import Link from "next/link";
import { isDemoCheckId } from "@/lib/demo-data";

export function CaseRemovePanel({
  checkId,
  checkLabel,
  removable,
}: {
  checkId: string;
  checkLabel: string;
  removable: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!removable && !isDemoCheckId(checkId)) {
    return null;
  }

  function handleDeleted(message: string) {
    setToastMessage(message);
    window.setTimeout(() => {
      router.push(withLocalePath(locale, "/dashboard"));
      router.refresh();
    }, 600);
  }

  return (
    <>
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {isDemoCheckId(checkId) ? t("newCheckFlow.sampleCaseTitle") : t("newCheckFlow.draftCaseTitle")}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("newCheckFlow.draftCaseBody")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <DeleteCheckButton checkId={checkId} checkLabel={checkLabel} onDeleted={handleDeleted} />
          <Link className="workspace-cta-secondary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold" href={withLocalePath(locale, "/dashboard")}>
            {t("newCheckFlow.backToList")}
          </Link>
        </div>
      </div>
      {toastMessage ? <DashboardToast message={toastMessage} onDismiss={() => setToastMessage(null)} /> : null}
    </>
  );
}
