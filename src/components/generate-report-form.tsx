"use client";

import { useActionState } from "react";
import { generateReportAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

export function GenerateReportForm({ checkId }: { checkId: string }) {
  const action = generateReportAction.bind(null, checkId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton className="w-full" pendingLabel="Generating report...">
        Generate SafeKey recommendation
      </SubmitButton>
      <p className="text-xs leading-6 text-slate-500">
        This scores the applicant, checks for missing documents, and refreshes the structured recommendation
        plus the protection eligibility layer.
      </p>
      <FormStatusMessage state={state} />
    </form>
  );
}
