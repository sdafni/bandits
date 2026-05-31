"use client";

import { useState } from "react";
import { PlanRequiredModal } from "@/components/plan-required-modal";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/lib/i18n/context";

type CreateUploadLinkButtonProps = {
  canActivate: boolean;
  className?: string;
  formAction?: React.ComponentProps<"form">["action"];
  labelKey?: "checkCreated.activateLink" | "workspace.activateWorkflow";
  pendingLabel?: string;
  variant?: "workspace" | "secondary";
};

export function CreateUploadLinkButton({
  canActivate,
  className = "workspace-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold sm:w-auto",
  formAction,
  labelKey = "checkCreated.activateLink",
  pendingLabel,
  variant = "workspace",
}: CreateUploadLinkButtonProps) {
  const t = useT();
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const label = t(labelKey);
  const pending = pendingLabel ?? t("checkCreated.activatingLink");

  if (canActivate && formAction) {
    return (
      <form action={formAction} className="w-full sm:w-auto">
        <SubmitButton className={className} pendingLabel={pending} variant={variant}>
          {label}
        </SubmitButton>
      </form>
    );
  }

  return (
    <>
      <button className={className} onClick={() => setPlanModalOpen(true)} type="button">
        {label}
      </button>
      <PlanRequiredModal onClose={() => setPlanModalOpen(false)} open={planModalOpen} />
    </>
  );
}
