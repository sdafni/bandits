"use client";

import { useActionState } from "react";
import { startSubscriptionCheckoutAction, type ActionState } from "@/app/actions";
import type { BillingPlanKey } from "@/lib/billing";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

export function SubscriptionCheckoutForm({
  className,
  formId,
  label,
  pendingLabel,
  planKey,
  variant = "primary",
}: {
  className?: string;
  formId?: string;
  label: string;
  pendingLabel: string;
  planKey: BillingPlanKey;
  variant?: "primary" | "secondary";
}) {
  const action = startSubscriptionCheckoutAction.bind(null, planKey);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3" id={formId}>
      <SubmitButton className={className} pendingLabel={pendingLabel} variant={variant}>
        {label}
      </SubmitButton>
      <FormStatusMessage state={state} />
    </form>
  );
}
