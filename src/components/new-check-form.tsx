"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createTenantCheckAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import {
  TRUST_DOCUMENT_CATEGORIES,
  TRUST_DOCUMENT_DEFINITIONS,
  getRequiredDocumentsForExperience,
  type TrustWorkflowExperience,
} from "@/lib/trust-workflows";

const initialState: ActionState = {};

const STEPS = [
  { id: 1, title: "Property details" },
  { id: 2, title: "Tenant details" },
  { id: 3, title: "Documents requested" },
  { id: 4, title: "Review and create" },
] as const;
const NEW_SCREENING_DRAFT_KEY = "safekey.new-screening.draft.v1";
type ScreeningDraft = {
  propertyName?: string;
  monthlyRent?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  tenantFullName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  requestedDocuments?: string[];
  step?: number;
};

function readDraft(): ScreeningDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(NEW_SCREENING_DRAFT_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ScreeningDraft;
  } catch {
    window.localStorage.removeItem(NEW_SCREENING_DRAFT_KEY);
    return null;
  }
}

type NewCheckFormProps = {
  onCancel?: () => void;
  experience?: TrustWorkflowExperience;
};

export function NewCheckForm({ onCancel, experience = "basic" }: NewCheckFormProps = {}) {
  const draft = readDraft();
  const requiredDocuments = useMemo<Set<string>>(
    () => new Set(getRequiredDocumentsForExperience(experience)),
    [experience],
  );
  const [state, action] = useActionState(createTenantCheckAction, initialState);
  const [step, setStep] = useState(Math.max(1, Math.min(4, draft?.step ?? 1)));
  const [propertyName, setPropertyName] = useState(draft?.propertyName ?? "");
  const [monthlyRent, setMonthlyRent] = useState(draft?.monthlyRent ?? "");
  const [addressLine1, setAddressLine1] = useState(draft?.addressLine1 ?? "");
  const [city, setCity] = useState(draft?.city ?? "Athens");
  const [postalCode, setPostalCode] = useState(draft?.postalCode ?? "");
  const [tenantFullName, setTenantFullName] = useState(draft?.tenantFullName ?? "");
  const [tenantEmail, setTenantEmail] = useState(draft?.tenantEmail ?? "");
  const [tenantPhone, setTenantPhone] = useState(draft?.tenantPhone ?? "");
  const [requestedDocuments, setRequestedDocuments] = useState<string[]>(
    draft?.requestedDocuments && draft.requestedDocuments.length > 0
      ? draft.requestedDocuments
      : [...requiredDocuments],
  );

  const stepTitle = STEPS.find((item) => item.id === step)?.title ?? STEPS[0].title;
  const progressWidth = `${Math.round((step / STEPS.length) * 100)}%`;
  const canContinueStepOne = propertyName.trim().length >= 2 && addressLine1.trim().length >= 6 && city.trim().length >= 2 && Number(monthlyRent) > 0;
  const canContinueStepTwo = tenantFullName.trim().length >= 2;
  const canContinueStepThree = requestedDocuments.length > 0;

  const selectedDocumentLabels = useMemo(
    () => TRUST_DOCUMENT_DEFINITIONS.filter((option) => requestedDocuments.includes(option.value)).map((option) => option.label),
    [requestedDocuments],
  );
  const requiredMissingCount = [...requiredDocuments].filter((value) => !requestedDocuments.includes(value)).length;
  const requestedProgress = Math.round((requestedDocuments.length / TRUST_DOCUMENT_DEFINITIONS.length) * 100);

  const canContinue = step === 1 ? canContinueStepOne : step === 2 ? canContinueStepTwo : step === 3 ? canContinueStepThree : true;

  useEffect(() => {
    const draft = {
      addressLine1,
      city,
      monthlyRent,
      postalCode,
      propertyName,
      requestedDocuments,
      step,
      tenantEmail,
      tenantFullName,
      tenantPhone,
    };
    window.localStorage.setItem(NEW_SCREENING_DRAFT_KEY, JSON.stringify(draft));
  }, [
    addressLine1,
    city,
    monthlyRent,
    postalCode,
    propertyName,
    requestedDocuments,
    step,
    tenantEmail,
    tenantFullName,
    tenantPhone,
  ]);

  function toggleRequestedDocument(value: string) {
    setRequestedDocuments((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step {step} of 4</p>
        <p className="text-sm font-semibold text-primary">{stepTitle}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: progressWidth }} />
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="form-label">Property name</span>
              <input
                className="input"
                name="property_name"
                onChange={(event) => setPropertyName(event.target.value)}
                placeholder="Kolonaki Apartment 3B"
                required
                value={propertyName}
              />
            </label>
            <label className="space-y-2">
              <span className="form-label">Monthly rent (EUR)</span>
              <input
                className="input"
                min="1"
                name="monthly_rent"
                onChange={(event) => setMonthlyRent(event.target.value)}
                required
                type="number"
                value={monthlyRent}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <label className="space-y-2">
              <span className="form-label">Property address</span>
              <input
                className="input"
                name="address_line1"
                onChange={(event) => setAddressLine1(event.target.value)}
                placeholder="12 Leof. Kifisias"
                required
                value={addressLine1}
              />
            </label>
            <label className="space-y-2">
              <span className="form-label">City</span>
              <input className="input" name="city" onChange={(event) => setCity(event.target.value)} required value={city} />
            </label>
            <label className="space-y-2">
              <span className="form-label">Postal code</span>
              <input
                className="input"
                name="postal_code"
                onChange={(event) => setPostalCode(event.target.value)}
                placeholder="11526"
                value={postalCode}
              />
            </label>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="form-label">Applicant full name</span>
              <input
                className="input"
                name="tenant_full_name"
                onChange={(event) => setTenantFullName(event.target.value)}
                placeholder="Maria Papadopoulou"
                required
                value={tenantFullName}
              />
            </label>
            <label className="space-y-2">
              <span className="form-label">Applicant email</span>
              <input
                className="input"
                name="tenant_email"
                onChange={(event) => setTenantEmail(event.target.value)}
                placeholder="maria@example.com"
                type="email"
                value={tenantEmail}
              />
            </label>
          </div>
          <label className="space-y-2">
            <span className="form-label">Applicant phone</span>
            <input
              className="input"
              name="tenant_phone"
              onChange={(event) => setTenantPhone(event.target.value)}
              placeholder="+30 69..."
              value={tenantPhone}
            />
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <fieldset className="space-y-3">
          <legend className="form-label">Requested screening documents</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {(Object.keys(TRUST_DOCUMENT_CATEGORIES) as Array<keyof typeof TRUST_DOCUMENT_CATEGORIES>).map((category) => (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" key={category}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                  {TRUST_DOCUMENT_CATEGORIES[category].label}
                </p>
                <div className="space-y-2">
                  {TRUST_DOCUMENT_DEFINITIONS.filter((option) => option.category === category).map((option) => (
                    <label className="selection-chip" key={option.value}>
                      <input
                        checked={requestedDocuments.includes(option.value)}
                        name="requested_documents"
                        onChange={() => toggleRequestedDocument(option.value)}
                        type="checkbox"
                        value={option.value}
                      />
                      <span className="inline-flex items-center gap-2">
                        {option.label}
                        <span className="text-xs text-slate-500">
                          {requiredDocuments.has(option.value) ? "Required" : "Optional"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-secondary">
              Required missing: {requiredMissingCount} · Requested set coverage: {requestedProgress}%
            </p>
          </div>
        </fieldset>
      ) : null}

      {step === 4 ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-primary">Review and create secure upload link</p>
          <ul className="space-y-1.5 text-sm text-secondary">
            <li>
              <span className="font-semibold text-primary">Property:</span> {propertyName || "—"} · {city || "—"}
            </li>
            <li>
              <span className="font-semibold text-primary">Address:</span> {addressLine1 || "—"} {postalCode ? `(${postalCode})` : ""}
            </li>
            <li>
              <span className="font-semibold text-primary">Monthly rent:</span> {monthlyRent ? `€${monthlyRent}` : "—"}
            </li>
            <li>
              <span className="font-semibold text-primary">Tenant:</span> {tenantFullName || "—"}
              {tenantEmail ? ` · ${tenantEmail}` : ""}
              {tenantPhone ? ` · ${tenantPhone}` : ""}
            </li>
            <li>
              <span className="font-semibold text-primary">Documents:</span>{" "}
              {selectedDocumentLabels.length > 0 ? selectedDocumentLabels.join(", ") : "—"}
            </li>
          </ul>
          <p className="text-xs text-muted">A secure upload link is generated and can be shared with the tenant immediately.</p>
        </div>
      ) : null}

      <FormStatusMessage state={state} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          {onCancel ? (
            <button className="workspace-cta-secondary workspace-cta-secondary--compact" onClick={onCancel} type="button">
              Cancel
            </button>
          ) : null}
          {step > 1 ? (
            <button
              className="workspace-cta-secondary workspace-cta-secondary--compact"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              type="button"
            >
              Back
            </button>
          ) : null}
        </div>

        {step < 4 ? (
          <button
            className="workspace-cta workspace-cta--compact"
            disabled={!canContinue}
            onClick={() => setStep((current) => Math.min(4, current + 1))}
            type="button"
          >
            Continue
          </button>
        ) : (
          <SubmitButton pendingLabel="Creating check..." variant="workspace">
            Create SafeKey check
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
