"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTenantCheckAction } from "@/app/actions";
import { isDemoCheckId } from "@/lib/demo-data";
import { dismissDemoCaseId } from "@/lib/dismissed-demo-cases";
import { useT } from "@/lib/i18n/context";

export function DeleteCheckButton({
  checkId,
  checkLabel,
  compact = false,
  onDeleted,
}: {
  checkId: string;
  checkLabel: string;
  compact?: boolean;
  onDeleted?: (message: string) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const prompt = isDemoCheckId(checkId)
      ? t("newCheckFlow.confirmRemoveSample")
      : t("newCheckFlow.confirmRemoveCheck");

    if (!window.confirm(prompt.replace("{name}", checkLabel))) {
      return;
    }

    startTransition(async () => {
      if (isDemoCheckId(checkId)) {
        dismissDemoCaseId(checkId);
        onDeleted?.(t("newCheckFlow.removedToast"));
        router.refresh();
        return;
      }

      const result = await deleteTenantCheckAction(checkId);
      if (result.error) {
        window.alert(result.error);
        return;
      }

      onDeleted?.(result.success ?? t("newCheckFlow.removedToast"));
      router.refresh();
    });
  }

  return (
    <button
      aria-label={t("newCheckFlow.removeCheck")}
      className={
        compact
          ? "inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          : "workspace-cta-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
      }
      disabled={isPending}
      onClick={handleDelete}
      type="button"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      {compact ? null : <span>{isPending ? t("newCheckFlow.removing") : t("newCheckFlow.removeCheck")}</span>}
    </button>
  );
}
