"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input className="input" name="email" required type="email" />
      </label>
      <FormStatusMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Sending reset link...">
        Send reset link
      </SubmitButton>
    </form>
  );
}
