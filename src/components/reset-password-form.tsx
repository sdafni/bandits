"use client";

import { useActionState } from "react";
import { updatePasswordAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/lib/i18n/context";

const initialState: ActionState = {};

export function ResetPasswordForm() {
  const t = useT();
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5" data-testid="reset-password-form">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">{t("auth.password")}</span>
        <input
          className="input"
          data-testid="reset-password-input"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <FormStatusMessage state={state} />
      <SubmitButton className="w-full" data-testid="reset-password-submit" pendingLabel={t("auth.resetPasswordPending")}>
        {t("auth.resetPasswordSubmit")}
      </SubmitButton>
    </form>
  );
}
