"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { getPlansPagePath } from "@/lib/plan-gated-upload-link";

type PlanRequiredModalProps = {
  onClose: () => void;
  open: boolean;
};

export function PlanRequiredModal({ onClose, open }: PlanRequiredModalProps) {
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();

  if (!open) {
    return null;
  }

  function goToPlans() {
    router.push(getPlansPagePath(locale));
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end bg-slate-950/55 p-0 sm:items-center sm:justify-center sm:p-6"
      role="dialog"
    >
      <button
        aria-label={t("checkCreated.planRequiredModalNotNow")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-2 pr-2">
            <h2 className="text-lg font-semibold leading-snug text-slate-950 sm:text-xl">
              {t("checkCreated.planRequiredModalTitle")}
            </h2>
            <p className="text-sm leading-6 text-slate-700">{t("checkCreated.planRequiredModalBody")}</p>
          </div>
          <button
            aria-label={t("checkCreated.planRequiredModalNotNow")}
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="text-xs leading-5 text-slate-500">{t("checkCreated.planRequiredModalFootnote")}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button className="workspace-cta min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold" onClick={goToPlans} type="button">
            {t("checkCreated.planRequiredModalViewPlans")}
          </button>
          <button
            className="min-h-11 w-full rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            {t("checkCreated.planRequiredModalNotNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
