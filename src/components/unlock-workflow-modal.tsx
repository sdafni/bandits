"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ScreeningCheckoutForm } from "@/components/screening-checkout-form";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

type UnlockWorkflowModalProps = {
  checkId: string;
  onClose: () => void;
  open: boolean;
  trigger: "upload_link" | "trust_report";
};

export function UnlockWorkflowModal({ checkId, onClose, open, trigger }: UnlockWorkflowModalProps) {
  const { locale } = useLocale();
  const t = useT();

  if (!open) {
    return null;
  }

  const triggerBody =
    trigger === "trust_report" ? t("workspace.unlockBodyReport") : t("workspace.unlockBodyUpload");

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end bg-slate-950/55 p-0 sm:items-center sm:justify-center sm:p-6"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#e5ebf3] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b6b17]">{t("workspace.unlockKicker")}</p>
            <h2 className="text-xl font-semibold text-slate-950">{t("workspace.unlockTitle")}</h2>
          </div>
          <button
            aria-label={t("workspace.close")}
            className="workspace-cta-secondary workspace-cta-secondary--compact"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-7 text-slate-600">{triggerBody}</p>

        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>• {t("workspace.unlockFeatureUpload")}</li>
          <li>• {t("workspace.unlockFeatureReport")}</li>
          <li>• {t("workspace.unlockFeatureTrust")}</li>
        </ul>

        <div className="mt-6 space-y-3">
          <ScreeningCheckoutForm
            checkId={checkId}
            className="w-full"
            label={t("workspace.unlockCtaScreening")}
            pendingLabel={t("workspace.unlockCtaPending")}
          />
          <Link
            className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold"
            href={withLocalePath(locale, "/dashboard/billing")}
          >
            {t("workspace.unlockCtaPlans")}
          </Link>
        </div>

        <p className="mt-4 text-xs leading-6 text-slate-500">{t("workspace.unlockFootnote")}</p>
      </div>
    </div>
  );
}
