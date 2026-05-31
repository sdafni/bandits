import type {
  GateEvaluationMap,
  MonetizationBlockReason,
  MonetizationConfig,
  MonetizationMode,
} from "@/lib/monetization/types";

/**
 * Semantic permissions for UI and route handlers.
 * Screens must depend on this shape — never on raw gate keys or Stripe fields.
 */
export type MonetizationPermissions = {
  monetizationMode: MonetizationMode;
  billingNavEnabled: boolean;
  canCreateUploadLink: boolean;
  canRunAnalysis: boolean;
  canViewFullReport: boolean;
  /** True when billing is on but upload link is blocked — show plan modal (PREPAY). */
  shouldPromptPlanBeforeUploadLink: boolean;
  createUploadLinkBlockReason: MonetizationBlockReason | null;
  viewFullReportBlockReason: MonetizationBlockReason | null;
  reportUnlockPriceCents: number;
};

/** Serializable snapshot passed from server components to client UI. */
export type MonetizationPermissionsSnapshot = MonetizationPermissions;

export function resolveMonetizationPermissions(params: {
  config: MonetizationConfig;
  gates: GateEvaluationMap;
  billingNavEnabled: boolean;
  createUploadLinkBlockReason: MonetizationBlockReason | null;
  viewFullReportBlockReason: MonetizationBlockReason | null;
}): MonetizationPermissions {
  const canCreateUploadLink = params.gates.create_upload_link;

  return {
    billingNavEnabled: params.billingNavEnabled,
    canCreateUploadLink,
    canRunAnalysis: params.gates.run_analysis,
    canViewFullReport: params.gates.view_report,
    createUploadLinkBlockReason: params.createUploadLinkBlockReason,
    monetizationMode: params.config.mode,
    reportUnlockPriceCents: params.config.reportUnlockPriceCents,
    shouldPromptPlanBeforeUploadLink:
      params.billingNavEnabled &&
      !canCreateUploadLink &&
      params.createUploadLinkBlockReason === "plan_required",
    viewFullReportBlockReason: params.viewFullReportBlockReason,
  };
}

/** @deprecated Use MonetizationPermissionsSnapshot */
export type FunnelAccessClientSnapshot = MonetizationPermissionsSnapshot;

/** @deprecated Use resolveMonetizationPermissions */
export function toFunnelAccessClientSnapshot(params: {
  config: MonetizationConfig;
  gates: GateEvaluationMap;
  billingNavEnabled: boolean;
  uploadLinkFailure: MonetizationBlockReason | null;
  viewReportFailure: MonetizationBlockReason | null;
}): MonetizationPermissionsSnapshot {
  return resolveMonetizationPermissions({
    billingNavEnabled: params.billingNavEnabled,
    config: params.config,
    createUploadLinkBlockReason: params.uploadLinkFailure,
    gates: params.gates,
    viewFullReportBlockReason: params.viewReportFailure,
  });
}
