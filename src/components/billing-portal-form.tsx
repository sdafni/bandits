"use client";

import { useActionState } from "react";
import { openBillingPortalAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

export function BillingPortalForm({
  className,
  label = "Manage billing",
  pendingLabel = "Opening billing...",
  variant = "primary",
}: {
  className?: string;
  label?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction] = useActionState(openBillingPortalAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton className={className} pendingLabel={pendingLabel} variant={variant}>
        {label}
      </SubmitButton>
      <FormStatusMessage state={state} />
    </form>
  );
}
