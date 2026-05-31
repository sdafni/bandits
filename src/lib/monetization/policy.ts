import type {
  GateEvaluationMap,
  MonetizationBlockReason,
  MonetizationConfig,
  MonetizationEntitlements,
  MonetizationGateKey,
  MonetizationGateRequirement,
} from "@/lib/monetization/types";
import { MONETIZATION_GATE_KEYS } from "@/lib/monetization/types";

function satisfiesRequirement(
  requirement: MonetizationGateRequirement,
  entitlements: MonetizationEntitlements,
): boolean {
  switch (requirement) {
    case "free":
      return true;
    case "subscription_or_per_check":
      return entitlements.hasActiveSubscription || entitlements.hasPerCheckPayment;
    case "subscription_only":
      return entitlements.hasActiveSubscription;
    case "per_check_payment":
      return entitlements.hasPerCheckPayment;
    case "per_report_unlock":
      return (
        entitlements.hasReportUnlockPayment ||
        entitlements.hasPerCheckPayment ||
        entitlements.hasActiveSubscription
      );
    default:
      return false;
  }
}

export function evaluateMonetizationGate(
  requirement: MonetizationGateRequirement,
  entitlements: MonetizationEntitlements,
  billingEnabled: boolean,
): boolean {
  if (!billingEnabled || requirement === "free") {
    return true;
  }

  return satisfiesRequirement(requirement, entitlements);
}

/** @deprecated Use evaluateMonetizationGate */
export const evaluateBillingGate = evaluateMonetizationGate;

export function evaluateAllMonetizationGates(
  config: MonetizationConfig,
  entitlements: MonetizationEntitlements,
): GateEvaluationMap {
  return MONETIZATION_GATE_KEYS.reduce((accumulator, gate) => {
    accumulator[gate] = evaluateMonetizationGate(config.gates[gate], entitlements, config.billingEnabled);
    return accumulator;
  }, {} as GateEvaluationMap);
}

/** @deprecated Use evaluateAllMonetizationGates */
export const evaluateAllBillingGates = evaluateAllMonetizationGates;

export function getMonetizationBlockReason(
  gate: MonetizationGateKey,
  config: MonetizationConfig,
  entitlements: MonetizationEntitlements,
): MonetizationBlockReason | null {
  const requirement = config.gates[gate];
  if (evaluateMonetizationGate(requirement, entitlements, config.billingEnabled)) {
    return null;
  }

  switch (requirement) {
    case "subscription_or_per_check":
    case "subscription_only":
      return "plan_required";
    case "per_check_payment":
      return "per_check_required";
    case "per_report_unlock":
      return "report_unlock_required";
    default:
      return null;
  }
}

/** @deprecated Use getMonetizationBlockReason */
export const getGateFailureKind = getMonetizationBlockReason;

/**
 * Whether a newly saved check should auto-activate its upload link.
 * PREPAY: only when the upload-link gate is open (landlord has plan/per-check).
 * REPORT_UNLOCK: when preset auto-create is enabled and gate is open (always free).
 */
export function shouldAutoActivateUploadLinkOnCheckCreate(
  config: MonetizationConfig,
  entitlements: MonetizationEntitlements,
): boolean {
  const gateOpen = evaluateMonetizationGate(
    config.gates.create_upload_link,
    entitlements,
    config.billingEnabled,
  );

  if (!gateOpen) {
    return false;
  }

  return config.autoCreateUploadLinkOnCheckCreate;
}

/** @deprecated Use shouldAutoActivateUploadLinkOnCheckCreate */
export const shouldAutoCreateUploadLinkOnCheckCreate = shouldAutoActivateUploadLinkOnCheckCreate;
