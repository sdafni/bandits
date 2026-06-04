import "server-only";

import type { BillingPlanLimits } from "@/lib/billing";
import { isAdminContext } from "@/lib/auth";
import { type GateEvaluationMap, type MonetizationEntitlements, MONETIZATION_GATE_KEYS } from "@/lib/monetization";
import type { WorkspaceAccessContext } from "@/lib/workspace-access";
import { createAdminClient } from "@/lib/supabase/admin";

/** Internal ops / demos — no plan caps. */
export const ADMIN_UNLIMITED_LIMITS: BillingPlanLimits = {
  activeChecks: 999_999,
  completedChecksPerMonth: 999_999,
};

export function isAdminProfile(profile: { email: string; role: string }) {
  return isAdminContext(profile.email, profile.role);
}

export async function isAdminLandlordId(landlordId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("email, role").eq("id", landlordId).maybeSingle();

  if (!data) {
    return false;
  }

  return isAdminContext(data.email, data.role);
}

export function getAdminMonetizationEntitlements(): MonetizationEntitlements {
  return {
    hasActiveSubscription: true,
    hasPerCheckPayment: true,
    hasReportUnlockPayment: true,
  };
}

export function getAdminMonetizationGates(): GateEvaluationMap {
  return MONETIZATION_GATE_KEYS.reduce((accumulator, gate) => {
    accumulator[gate] = true;
    return accumulator;
  }, {} as GateEvaluationMap);
}

export function applyAdminWorkspaceOverrides(access: WorkspaceAccessContext): WorkspaceAccessContext {
  const gates = getAdminMonetizationGates();

  return {
    ...access,
    gates,
    hasActiveSubscription: true,
    limits: ADMIN_UNLIMITED_LIMITS,
    mode: "subscribed",
    planKey: "premium",
    screeningCredits: 999_999,
  };
}
