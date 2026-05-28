"use client";

import { useActionState } from "react";
import { createTenantCheckAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

const REQUESTED_DOCUMENT_OPTIONS = [
  { value: "government_id", label: "Government ID" },
  { value: "proof_of_income", label: "Proof of income" },
  { value: "employment_letter", label: "Employment letter" },
  { value: "bank_statement", label: "Recent bank statement" },
  { value: "rental_reference", label: "Rental reference" },
  { value: "tax_return", label: "Tax return" },
];

export function NewCheckForm() {
  const [state, action] = useActionState(createTenantCheckAction, initialState);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="form-label">Property name</span>
          <input className="input" name="property_name" placeholder="Kolonaki Apartment 3B" required />
        </label>
        <label className="space-y-2">
          <span className="form-label">Monthly rent (EUR)</span>
          <input className="input" min="1" name="monthly_rent" required type="number" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <label className="space-y-2">
          <span className="form-label">Property address</span>
          <input className="input" name="address_line1" placeholder="12 Leof. Kifisias" required />
        </label>
        <label className="space-y-2">
          <span className="form-label">City</span>
          <input className="input" defaultValue="Athens" name="city" required />
        </label>
        <label className="space-y-2">
          <span className="form-label">Postal code</span>
          <input className="input" name="postal_code" placeholder="11526" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="form-label">Applicant full name</span>
          <input className="input" name="tenant_full_name" placeholder="Maria Papadopoulou" required />
        </label>
        <label className="space-y-2">
          <span className="form-label">Applicant email</span>
          <input className="input" name="tenant_email" placeholder="maria@example.com" type="email" />
        </label>
      </div>

      <label className="space-y-2">
        <span className="form-label">Applicant phone</span>
        <input className="input" name="tenant_phone" placeholder="+30 69..." />
      </label>

      <fieldset className="space-y-3">
        <legend className="form-label">Requested screening documents</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {REQUESTED_DOCUMENT_OPTIONS.map((option, index) => (
            <label
              className="selection-chip"
              key={option.value}
            >
              <input
                defaultChecked={index < 4}
                name="requested_documents"
                type="checkbox"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormStatusMessage state={state} />

      <SubmitButton pendingLabel="Creating check..." variant="workspace">
        Create SafeKey check
      </SubmitButton>
    </form>
  );
}
