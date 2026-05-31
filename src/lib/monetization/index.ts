export type { MonetizationAction } from "@/lib/monetization/actions";
export { MONETIZATION_ACTION_GATE } from "@/lib/monetization/actions";
export {
  evaluateAllMonetizationGates,
  evaluateMonetizationGate,
  getMonetizationBlockReason,
  shouldAutoActivateUploadLinkOnCheckCreate,
} from "@/lib/monetization/policy";
export {
  resolveMonetizationPermissions,
  toFunnelAccessClientSnapshot,
} from "@/lib/monetization/permissions";
export type {
  FunnelAccessClientSnapshot,
  MonetizationPermissions,
  MonetizationPermissionsSnapshot,
} from "@/lib/monetization/permissions";
export {
  applyMonetizationModePreset,
  DEFAULT_MONETIZATION_CONFIG,
  MONETIZATION_GATE_KEYS,
  MONETIZATION_MODE_PRESETS,
  MONETIZATION_SETTINGS_KEY,
  parseMonetizationConfig,
  serializeMonetizationConfig,
} from "@/lib/monetization/types";
export type {
  BillingEntitlementSnapshot,
  BillingFunnelConfig,
  BillingGateKey,
  BillingGateRequirement,
  FunnelMode,
  GateEvaluationMap,
  GateFailureKind,
  MonetizationBlockReason,
  MonetizationConfig,
  MonetizationEntitlements,
  MonetizationGateKey,
  MonetizationGateRequirement,
  MonetizationMode,
} from "@/lib/monetization/types";

// Backward-compatible aliases
export {
  applyMonetizationModePreset as applyFunnelModePreset,
  DEFAULT_MONETIZATION_CONFIG as DEFAULT_BILLING_FUNNEL_CONFIG,
  MONETIZATION_GATE_KEYS as BILLING_GATE_KEYS,
  MONETIZATION_MODE_PRESETS as FUNNEL_MODE_PRESETS,
  MONETIZATION_SETTINGS_KEY as BILLING_FUNNEL_SETTINGS_KEY,
  parseMonetizationConfig as parseBillingFunnelConfig,
  serializeMonetizationConfig as serializeBillingFunnelConfig,
} from "@/lib/monetization/types";
export {
  evaluateAllMonetizationGates as evaluateAllBillingGates,
  evaluateMonetizationGate as evaluateBillingGate,
  getMonetizationBlockReason as getGateFailureKind,
  shouldAutoActivateUploadLinkOnCheckCreate as shouldAutoCreateUploadLinkOnCheckCreate,
} from "@/lib/monetization/policy";
