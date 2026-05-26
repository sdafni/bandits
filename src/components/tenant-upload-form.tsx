"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentsAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

const DOCUMENT_TYPES = [
  { value: "government_id", label: "Government ID" },
  { value: "proof_of_income", label: "Proof of income" },
  { value: "employment_letter", label: "Employment letter" },
  { value: "bank_statement", label: "Bank statement" },
  { value: "rental_reference", label: "Rental reference" },
  { value: "supporting_document", label: "Other supporting document" },
];

export function TenantUploadForm({
  token,
  tenantName,
}: {
  token: string;
  tenantName: string;
}) {
  const router = useRouter();
  const action = uploadDocumentsAction.bind(null, token);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Full name</span>
          <input className="input" defaultValue={tenantName} name="full_name" required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input className="input" name="email" required type="email" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Phone</span>
          <input className="input" name="phone" required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Current address</span>
          <input className="input" name="current_address" required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Employment status</span>
          <select className="input" name="employment_status" required>
            <option value="">Select...</option>
            <option value="full_time">Full-time employment</option>
            <option value="part_time">Part-time employment</option>
            <option value="self_employed">Self-employed</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Employer name</span>
          <input className="input" name="employer_name" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Monthly income (EUR)</span>
          <input className="input" min="1" name="monthly_income" required type="number" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Expected move-in date</span>
          <input className="input" name="move_in_date" type="date" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Document category</span>
          <select className="input" name="document_type" required>
            <option value="">Select category...</option>
            {DOCUMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm leading-6 text-slate-500">
        Upload one document category per submission. You can send additional batches afterward for the rest of
        the requested pack.
      </p>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Notes for the reviewer</span>
        <textarea
          className="input min-h-28"
          name="notes"
          placeholder="Share context that may help the owner, agent, or reviewer understand your application."
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Document notes</span>
        <textarea
          className="input min-h-24"
          name="document_notes"
          placeholder="Optional note specific to this document batch."
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Upload documents</span>
        <input
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json"
          className="input file:mb-3 file:mr-0 file:block file:w-full file:rounded-full file:border-0 file:bg-[#0f2343] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white sm:file:mb-0 sm:file:mr-4 sm:file:inline-block sm:file:w-auto"
          multiple
          name="documents"
          required
          type="file"
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <input className="mt-1" name="consent_confirmed" required type="checkbox" />
        <span>
          I confirm that the uploaded documents may be reviewed in SafeKey by the landlord, property
          professional, and authorized reviewer for the purpose of rental verification.
        </span>
      </label>

      <FormStatusMessage state={state} />
      <SubmitButton pendingLabel="Uploading batch...">Submit secure document batch</SubmitButton>
    </form>
  );
}
