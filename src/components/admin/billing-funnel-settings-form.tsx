"use client";

import { useActionState } from "react";
import {
  updateMonetizationSettingsAction,
  type AdminSettingsActionState,
} from "@/app/admin/settings/actions";
import {
  MONETIZATION_GATE_KEYS,
  type MonetizationConfig,
  type MonetizationGateRequirement,
} from "@/lib/monetization";
import { SubmitButton } from "@/components/submit-button";

const initialState: AdminSettingsActionState = {};

const GATE_LABELS: Record<(typeof MONETIZATION_GATE_KEYS)[number], string> = {
  create_upload_link: "Create upload link",
  tenant_upload: "Tenant upload",
  run_analysis: "Run analysis",
  view_report: "View full report",
};

const REQUIREMENT_OPTIONS: Array<{ value: MonetizationGateRequirement; label: string }> = [
  { value: "free", label: "Free" },
  { value: "subscription_or_per_check", label: "Subscription or per-check payment" },
  { value: "subscription_only", label: "Subscription only" },
  { value: "per_check_payment", label: "Per-check payment only" },
  { value: "per_report_unlock", label: "Per-report unlock" },
];

export function MonetizationSettingsForm({ config }: { config: MonetizationConfig }) {
  const [state, formAction] = useActionState(updateMonetizationSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">MONETIZATION_MODE</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Production default is <code className="text-xs">PREPAY</code>. Switch to{" "}
          <code className="text-xs">REPORT_UNLOCK</code> only when running the Mode B experiment.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-[#0f2343] has-[:checked]:bg-slate-50">
            <input className="mt-1" defaultChecked={config.mode === "PREPAY"} name="mode" type="radio" value="PREPAY" />
            <span>
              <span className="block text-sm font-semibold text-slate-900">PREPAY (Mode A — current)</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                Plan → Upload Link → Upload → Analysis → Report
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-[#0f2343] has-[:checked]:bg-slate-50">
            <input
              className="mt-1"
              defaultChecked={config.mode === "REPORT_UNLOCK"}
              name="mode"
              type="radio"
              value="REPORT_UNLOCK"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">REPORT_UNLOCK (Mode B — experiment)</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                Upload Link → Upload → Analysis → Report Ready → Unlock Payment
              </span>
            </span>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input defaultChecked name="applyModePreset" type="checkbox" />
          Apply mode preset gates when saving
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Gate overrides</h2>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input defaultChecked={config.billingEnabled} name="billingEnabled" type="checkbox" />
          Billing enabled
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Report unlock price (cents)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            defaultValue={config.reportUnlockPriceCents}
            min={0}
            name="reportUnlockPriceCents"
            step={1}
            type="number"
          />
        </label>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            defaultChecked={config.autoCreateUploadLinkOnCheckCreate}
            name="autoCreateUploadLinkOnCheckCreate"
            type="checkbox"
          />
          Auto-create upload link when check is saved (if gate allows)
        </label>

        <div className="mt-5 space-y-4">
          {MONETIZATION_GATE_KEYS.map((gate) => (
            <label className="block text-sm" key={gate}>
              <span className="font-medium text-slate-800">{GATE_LABELS[gate]}</span>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                defaultValue={config.gates[gate]}
                name={`gate_${gate}`}
              >
                {REQUIREMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}

      <SubmitButton className="workspace-cta min-h-11" pendingLabel="Saving...">
        Save monetization settings
      </SubmitButton>
    </form>
  );
}

/** @deprecated Use MonetizationSettingsForm */
export const BillingFunnelSettingsForm = MonetizationSettingsForm;
