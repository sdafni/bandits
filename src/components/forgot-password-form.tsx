"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/lib/i18n/context";

const initialState: ActionState = {};

export function ForgotPasswordForm() {
  const t = useT();
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={formAction} className="space-y-5" data-testid="forgot-password-form">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("auth.email")}</span>
        <input className="input" data-testid="forgot-password-email" name="email" required type="email" />
      </label>
      <FormStatusMessage state={state} />
      <SubmitButton className="w-full" data-testid="forgot-password-submit" pendingLabel={t("auth.forgotPasswordPending")}>
        {t("auth.forgotPasswordSubmit")}
      </SubmitButton>
    </form>
  );
}
