import type { MonetizationGateKey } from "@/lib/monetization/types";

/**
 * Server-side monetization actions mapped to configurable gates.
 * Use assertMonetizationGateForCheck — never inline subscription checks in actions.
 */
export type MonetizationAction = MonetizationGateKey;

export const MONETIZATION_ACTION_GATE: Record<MonetizationAction, MonetizationGateKey> = {
  create_upload_link: "create_upload_link",
  tenant_upload: "tenant_upload",
  run_analysis: "run_analysis",
  view_report: "view_report",
};
