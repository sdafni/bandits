"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentsAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { TRUST_DOCUMENT_CATEGORIES, TRUST_DOCUMENT_DEFINITIONS } from "@/lib/trust-workflows";

const initialState: ActionState = {};

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
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  const selectedDocumentCategory = useMemo(
    () => TRUST_DOCUMENT_DEFINITIONS.find((item) => item.value === selectedDocumentType)?.category ?? null,
    [selectedDocumentType],
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Secure upload steps</p>
        <p>1) Add profile details 2) Choose document category 3) Upload files and submit securely.</p>
      </div>

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
          <select className="input" name="document_type" onChange={(event) => setSelectedDocumentType(event.target.value)} required>
            <option value="">Select category...</option>
            {TRUST_DOCUMENT_DEFINITIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.priority})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <p>
          Category: {selectedDocumentCategory ? TRUST_DOCUMENT_CATEGORIES[selectedDocumentCategory].label : "Not selected"} · Files
          ready: {selectedFilesCount}
        </p>
      </div>

      <p className="text-sm leading-6 text-slate-500">
        Upload one document category per submission. You can send additional batches afterward for the rest of
        the requested pack. Recommended documents improve trust confidence.
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
          onChange={(event) => setSelectedFilesCount(event.currentTarget.files?.length ?? 0)}
          required
          type="file"
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <input className="mt-1" name="consent_confirmed" required type="checkbox" />
        <span>
          I consent to the secure processing of my submitted documents for tenant screening purposes. I understand
          they may be reviewed by the landlord, property professional, and authorized reviewer. I have read the{" "}
          <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href="/privacy">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href="/terms">
            terms
          </Link>
          , and I consent to GDPR-compliant processing of my documents for this screening case.
        </span>
      </label>

      <FormStatusMessage state={state} />
      <SubmitButton pendingLabel="Uploading batch...">Submit secure document batch</SubmitButton>
    </form>
  );
}
