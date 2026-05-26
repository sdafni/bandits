"use client";

import { useActionState } from "react";
import {
  updateProtectionReviewAction,
  type ActionState,
} from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";

const initialState: ActionState = {};

const REVIEW_ACTIONS = [
  { label: "Approve", value: "eligible" },
  { label: "Conditional approval", value: "conditionally_eligible" },
  { label: "Reject", value: "not_eligible" },
  { label: "Request more documents", value: "pending_more_documents" },
] as const;

export function ProtectionReviewForm({ checkId }: { checkId: string }) {
  const action = updateProtectionReviewAction.bind(null, checkId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Manual override note</span>
        <textarea
          className="input min-h-[120px] resize-y"
          name="manual_override_note"
          placeholder="Add the manual review reasoning for this protection decision."
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {REVIEW_ACTIONS.map((item) => (
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f2343] transition hover:bg-white"
            key={item.value}
            name="status"
            type="submit"
            value={item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-xs leading-6 text-slate-500">
        This overrides the protection eligibility layer for presentation and internal review. It does not trigger
        live underwriting, payments, or compliance workflows.
      </p>

      <FormStatusMessage state={state} />
    </form>
  );
}
