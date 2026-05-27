"use client";

import { useActionState } from "react";
import { startScreeningCheckoutAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

export function ScreeningCheckoutForm({
  checkId,
  className,
  label = "Pay for this screening",
  pendingLabel = "Opening checkout...",
  variant = "primary",
}: {
  checkId: string;
  className?: string;
  label?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const action = startScreeningCheckoutAction.bind(null, checkId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton className={className} pendingLabel={pendingLabel} variant={variant}>
        {label}
      </SubmitButton>
      <FormStatusMessage state={state} />
    </form>
  );
}
