"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  applyMonetizationModePreset,
  MONETIZATION_GATE_KEYS,
  parseMonetizationConfig,
  type MonetizationGateRequirement,
  type MonetizationMode,
} from "@/lib/monetization";
import { updateMonetizationConfig } from "@/lib/platform-settings";

const gateRequirementSchema = z.enum([
  "free",
  "subscription_or_per_check",
  "subscription_only",
  "per_check_payment",
  "per_report_unlock",
]);

const updateMonetizationSchema = z.object({
  mode: z.enum(["PREPAY", "REPORT_UNLOCK"]),
  billingEnabled: z.coerce.boolean(),
  reportUnlockPriceCents: z.coerce.number().int().min(0).max(999_999),
  autoCreateUploadLinkOnCheckCreate: z.coerce.boolean(),
  applyModePreset: z.coerce.boolean().optional(),
  gates: z
    .object(
      MONETIZATION_GATE_KEYS.reduce(
        (accumulator, gate) => {
          accumulator[gate] = gateRequirementSchema;
          return accumulator;
        },
        {} as Record<(typeof MONETIZATION_GATE_KEYS)[number], typeof gateRequirementSchema>,
      ),
    )
    .partial()
    .optional(),
});

export type AdminSettingsActionState = {
  error?: string;
  success?: string;
};

export async function updateMonetizationSettingsAction(
  _prevState: AdminSettingsActionState,
  formData: FormData,
): Promise<AdminSettingsActionState> {
  try {
    const { profile } = await requireAdmin();

    const parsed = updateMonetizationSchema.safeParse({
      mode: formData.get("mode"),
      billingEnabled: formData.get("billingEnabled") === "on" || formData.get("billingEnabled") === "true",
      reportUnlockPriceCents: formData.get("reportUnlockPriceCents"),
      autoCreateUploadLinkOnCheckCreate:
        formData.get("autoCreateUploadLinkOnCheckCreate") === "on" ||
        formData.get("autoCreateUploadLinkOnCheckCreate") === "true",
      applyModePreset: formData.get("applyModePreset") === "on" || formData.get("applyModePreset") === "true",
      gates: MONETIZATION_GATE_KEYS.reduce(
        (accumulator, gate) => {
          const value = formData.get(`gate_${gate}`);
          if (typeof value === "string" && value.length > 0) {
            accumulator[gate] = value as MonetizationGateRequirement;
          }
          return accumulator;
        },
        {} as Partial<Record<(typeof MONETIZATION_GATE_KEYS)[number], MonetizationGateRequirement>>,
      ),
    });

    if (!parsed.success) {
      return { error: "Invalid monetization settings." };
    }

    let config = parseMonetizationConfig({
      mode: parsed.data.mode,
      billingEnabled: parsed.data.billingEnabled,
      reportUnlockPriceCents: parsed.data.reportUnlockPriceCents,
      autoCreateUploadLinkOnCheckCreate: parsed.data.autoCreateUploadLinkOnCheckCreate,
      gates: parsed.data.gates,
    });

    if (parsed.data.applyModePreset) {
      config = applyMonetizationModePreset(config, parsed.data.mode as MonetizationMode);
      config.billingEnabled = parsed.data.billingEnabled;
      config.reportUnlockPriceCents = parsed.data.reportUnlockPriceCents;
    }

    await updateMonetizationConfig(config, profile.id);

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");

    return {
      success:
        config.mode === "REPORT_UNLOCK"
          ? "Monetization mode set to REPORT_UNLOCK (Mode B)."
          : "Monetization mode set to PREPAY (Mode A).",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save monetization settings.",
    };
  }
}

/** @deprecated Use updateMonetizationSettingsAction */
export const updateBillingFunnelSettingsAction = updateMonetizationSettingsAction;
