/**
 * SafeKey monetization configuration.
 *
 * Mode A — PREPAY: Plan → Upload Link → Upload → Analysis → Report
 * Mode B — REPORT_UNLOCK: Upload Link → Upload → Analysis → Report Ready → Unlock Payment
 */

export type MonetizationMode = "PREPAY" | "REPORT_UNLOCK";

/** @deprecated Use MonetizationMode */
export type FunnelMode = MonetizationMode;

export type MonetizationGateKey =
  | "create_upload_link"
  | "tenant_upload"
  | "run_analysis"
  | "view_report";

/** @deprecated Use MonetizationGateKey */
export type BillingGateKey = MonetizationGateKey;

export type MonetizationGateRequirement =
  | "free"
  | "subscription_or_per_check"
  | "subscription_only"
  | "per_check_payment"
  | "per_report_unlock";

/** @deprecated Use MonetizationGateRequirement */
export type BillingGateRequirement = MonetizationGateRequirement;

export type MonetizationConfig = {
  /** Primary switch — maps to MONETIZATION_MODE env / admin setting. */
  mode: MonetizationMode;
  billingEnabled: boolean;
  gates: Record<MonetizationGateKey, MonetizationGateRequirement>;
  reportUnlockPriceCents: number;
  autoCreateUploadLinkOnCheckCreate: boolean;
};

/** @deprecated Use MonetizationConfig */
export type BillingFunnelConfig = MonetizationConfig;

export type MonetizationEntitlements = {
  hasActiveSubscription: boolean;
  hasPerCheckPayment: boolean;
  hasReportUnlockPayment: boolean;
};

/** @deprecated Use MonetizationEntitlements */
export type BillingEntitlementSnapshot = MonetizationEntitlements;

export type GateEvaluationMap = Record<MonetizationGateKey, boolean>;

export type MonetizationBlockReason = "plan_required" | "per_check_required" | "report_unlock_required";

/** @deprecated Use MonetizationBlockReason | null */
export type GateFailureKind = MonetizationBlockReason | null;

export const MONETIZATION_GATE_KEYS: MonetizationGateKey[] = [
  "create_upload_link",
  "tenant_upload",
  "run_analysis",
  "view_report",
];

/** @deprecated Use MONETIZATION_GATE_KEYS */
export const BILLING_GATE_KEYS = MONETIZATION_GATE_KEYS;

export const MONETIZATION_SETTINGS_KEY = "monetization";

/** @deprecated Use MONETIZATION_SETTINGS_KEY */
export const BILLING_FUNNEL_SETTINGS_KEY = "monetization";

const PREPAY_GATES: Record<MonetizationGateKey, MonetizationGateRequirement> = {
  create_upload_link: "free",
  tenant_upload: "free",
  run_analysis: "subscription_or_per_check",
  view_report: "subscription_or_per_check",
};

const REPORT_UNLOCK_GATES: Record<MonetizationGateKey, MonetizationGateRequirement> = {
  create_upload_link: "free",
  tenant_upload: "free",
  run_analysis: "free",
  view_report: "per_report_unlock",
};

export const MONETIZATION_MODE_PRESETS: Record<
  MonetizationMode,
  Pick<MonetizationConfig, "gates" | "autoCreateUploadLinkOnCheckCreate">
> = {
  PREPAY: {
    gates: PREPAY_GATES,
    autoCreateUploadLinkOnCheckCreate: false,
  },
  REPORT_UNLOCK: {
    gates: REPORT_UNLOCK_GATES,
    autoCreateUploadLinkOnCheckCreate: true,
  },
};

/** @deprecated Use MONETIZATION_MODE_PRESETS */
export const FUNNEL_MODE_PRESETS = MONETIZATION_MODE_PRESETS;

export const DEFAULT_MONETIZATION_CONFIG: MonetizationConfig = {
  mode: "PREPAY",
  billingEnabled: true,
  gates: { ...PREPAY_GATES },
  reportUnlockPriceCents: 1900,
  autoCreateUploadLinkOnCheckCreate: false,
};

/** @deprecated Use DEFAULT_MONETIZATION_CONFIG */
export const DEFAULT_BILLING_FUNNEL_CONFIG = DEFAULT_MONETIZATION_CONFIG;

const VALID_MODES = new Set<MonetizationMode>(["PREPAY", "REPORT_UNLOCK"]);
const VALID_REQUIREMENTS = new Set<MonetizationGateRequirement>([
  "free",
  "subscription_or_per_check",
  "subscription_only",
  "per_check_payment",
  "per_report_unlock",
]);

const LEGACY_MODE_MAP: Record<string, MonetizationMode> = {
  plan_first: "PREPAY",
  report_unlock: "REPORT_UNLOCK",
  PREPAY: "PREPAY",
  REPORT_UNLOCK: "REPORT_UNLOCK",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGateRequirement(value: unknown, fallback: MonetizationGateRequirement): MonetizationGateRequirement {
  return typeof value === "string" && VALID_REQUIREMENTS.has(value as MonetizationGateRequirement)
    ? (value as MonetizationGateRequirement)
    : fallback;
}

function normalizeMonetizationMode(raw: unknown): MonetizationMode {
  if (typeof raw === "string" && raw in LEGACY_MODE_MAP) {
    return LEGACY_MODE_MAP[raw];
  }

  return DEFAULT_MONETIZATION_CONFIG.mode;
}

export function parseMonetizationConfig(raw: unknown): MonetizationConfig {
  if (!isRecord(raw)) {
    return { ...DEFAULT_MONETIZATION_CONFIG, gates: { ...DEFAULT_MONETIZATION_CONFIG.gates } };
  }

  const mode = normalizeMonetizationMode(raw.mode);
  const preset = MONETIZATION_MODE_PRESETS[mode];
  const rawGates = isRecord(raw.gates) ? raw.gates : {};

  const gates = MONETIZATION_GATE_KEYS.reduce(
    (accumulator, gate) => {
      accumulator[gate] = parseGateRequirement(rawGates[gate], preset.gates[gate]);
      return accumulator;
    },
    {} as Record<MonetizationGateKey, MonetizationGateRequirement>,
  );

  return {
    mode,
    billingEnabled:
      typeof raw.billingEnabled === "boolean" ? raw.billingEnabled : DEFAULT_MONETIZATION_CONFIG.billingEnabled,
    gates,
    reportUnlockPriceCents:
      typeof raw.reportUnlockPriceCents === "number" && raw.reportUnlockPriceCents >= 0
        ? Math.round(raw.reportUnlockPriceCents)
        : DEFAULT_MONETIZATION_CONFIG.reportUnlockPriceCents,
    autoCreateUploadLinkOnCheckCreate:
      typeof raw.autoCreateUploadLinkOnCheckCreate === "boolean"
        ? raw.autoCreateUploadLinkOnCheckCreate
        : preset.autoCreateUploadLinkOnCheckCreate,
  };
}

/** @deprecated Use parseMonetizationConfig */
export const parseBillingFunnelConfig = parseMonetizationConfig;

export function applyMonetizationModePreset(
  config: MonetizationConfig,
  mode: MonetizationMode,
): MonetizationConfig {
  const preset = MONETIZATION_MODE_PRESETS[mode];

  return {
    ...config,
    mode,
    gates: { ...preset.gates },
    autoCreateUploadLinkOnCheckCreate: preset.autoCreateUploadLinkOnCheckCreate,
  };
}

/** @deprecated Use applyMonetizationModePreset */
export const applyFunnelModePreset = applyMonetizationModePreset;

export function serializeMonetizationConfig(config: MonetizationConfig): Record<string, unknown> {
  return {
    autoCreateUploadLinkOnCheckCreate: config.autoCreateUploadLinkOnCheckCreate,
    billingEnabled: config.billingEnabled,
    gates: { ...config.gates },
    mode: config.mode,
    reportUnlockPriceCents: config.reportUnlockPriceCents,
  };
}

/** @deprecated Use serializeMonetizationConfig */
export const serializeBillingFunnelConfig = serializeMonetizationConfig;
