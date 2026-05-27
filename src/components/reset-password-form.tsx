"use client";

import { useActionState } from "react";
import { updatePasswordAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">New password</span>
        <input className="input" minLength={8} name="password" required type="password" />
      </label>
      <FormStatusMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Updating password...">
        Update password
      </SubmitButton>
    </form>
  );
}
