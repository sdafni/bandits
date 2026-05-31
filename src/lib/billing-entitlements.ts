import "server-only";

import { isEntitledSubscriptionStatus } from "@/lib/billing";
import {
  evaluateAllMonetizationGates,
  getMonetizationBlockReason,
  resolveMonetizationPermissions,
  type MonetizationConfig,
  type MonetizationEntitlements,
  type MonetizationGateKey,
  type MonetizationPermissions,
} from "@/lib/monetization";
import type { BillingOverview } from "@/lib/billing-queries";
import { getBillingOverviewForUser, getScreeningPaymentForCheck } from "@/lib/billing-queries";
import { getStripeProductionReadiness } from "@/lib/env";
import { getMonetizationConfig } from "@/lib/platform-settings";

export type BillingEntitlements = MonetizationEntitlements & {
  activeSubscription: BillingOverview["activeSubscription"];
  screeningPayment: Awaited<ReturnType<typeof getScreeningPaymentForCheck>>;
  schemaReady: boolean;
};

export type MonetizationAccessSnapshot = {
  config: MonetizationConfig;
  entitlements: MonetizationEntitlements;
  gates: ReturnType<typeof evaluateAllMonetizationGates>;
  permissions: MonetizationPermissions;
  billingNavEnabled: boolean;
};

/** @deprecated Use MonetizationAccessSnapshot */
export type FunnelAccessSnapshot = MonetizationAccessSnapshot;

function buildEntitlementSnapshot(
  overview: Pick<BillingOverview, "activeSubscription">,
  screeningPayment: Awaited<ReturnType<typeof getScreeningPaymentForCheck>>,
): MonetizationEntitlements {
  const hasActiveSubscription = Boolean(
    overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status),
  );
  const hasPerCheckPayment = screeningPayment?.status === "paid";

  return {
    hasActiveSubscription,
    hasPerCheckPayment,
    hasReportUnlockPayment: hasPerCheckPayment,
  };
}

export async function resolveBillingEntitlementsForCheck({
  checkId,
  landlordId,
  useAdmin = false,
}: {
  checkId: string;
  landlordId: string;
  useAdmin?: boolean;
}): Promise<BillingEntitlements> {
  const [overview, screeningPayment] = await Promise.all([
    getBillingOverviewForUser(landlordId, { admin: useAdmin }),
    getScreeningPaymentForCheck(checkId, { admin: useAdmin }),
  ]);

  const snapshot = buildEntitlementSnapshot(overview, screeningPayment);

  return {
    ...snapshot,
    activeSubscription: overview.activeSubscription,
    screeningPayment,
    schemaReady: overview.schemaReady,
  };
}

export async function resolveBillingEntitlementsForLandlord(
  landlordId: string,
  options?: { admin?: boolean },
): Promise<BillingEntitlements> {
  const overview = await getBillingOverviewForUser(landlordId, options);
  const snapshot = buildEntitlementSnapshot(overview, null);

  return {
    ...snapshot,
    activeSubscription: overview.activeSubscription,
    screeningPayment: null,
    schemaReady: overview.schemaReady,
  };
}

export function resolveMonetizationAccessSnapshot(params: {
  config: MonetizationConfig;
  entitlements: MonetizationEntitlements;
  billingNavEnabled: boolean;
}): MonetizationAccessSnapshot {
  const gates = evaluateAllMonetizationGates(params.config, params.entitlements);
  const createUploadLinkBlockReason = getMonetizationBlockReason(
    "create_upload_link",
    params.config,
    params.entitlements,
  );
  const viewFullReportBlockReason = getMonetizationBlockReason("view_report", params.config, params.entitlements);

  return {
    billingNavEnabled: params.billingNavEnabled,
    config: params.config,
    entitlements: params.entitlements,
    gates,
    permissions: resolveMonetizationPermissions({
      billingNavEnabled: params.billingNavEnabled,
      config: params.config,
      createUploadLinkBlockReason,
      gates,
      viewFullReportBlockReason,
    }),
  };
}

/** @deprecated Use resolveMonetizationAccessSnapshot */
export const resolveFunnelAccessSnapshot = resolveMonetizationAccessSnapshot;

export async function resolveMonetizationAccessForLandlord(
  landlordId: string,
): Promise<MonetizationAccessSnapshot> {
  const [config, entitlements, stripeReadiness] = await Promise.all([
    getMonetizationConfig(),
    resolveBillingEntitlementsForLandlord(landlordId, { admin: true }),
    Promise.resolve(getStripeProductionReadiness()),
  ]);

  const billingNavEnabled =
    config.billingEnabled && stripeReadiness.isCheckoutReady && entitlements.schemaReady;

  return resolveMonetizationAccessSnapshot({
    billingNavEnabled,
    config,
    entitlements,
  });
}

/** @deprecated Use resolveMonetizationAccessForLandlord */
export const resolveFunnelAccessForLandlord = resolveMonetizationAccessForLandlord;

export async function resolveMonetizationAccessForCheck({
  checkId,
  landlordId,
  useAdmin = false,
}: {
  checkId: string;
  landlordId: string;
  useAdmin?: boolean;
}): Promise<MonetizationAccessSnapshot> {
  const [config, entitlements, stripeReadiness] = await Promise.all([
    getMonetizationConfig(),
    resolveBillingEntitlementsForCheck({ checkId, landlordId, useAdmin }),
    Promise.resolve(getStripeProductionReadiness()),
  ]);

  const billingNavEnabled =
    config.billingEnabled && stripeReadiness.isCheckoutReady && entitlements.schemaReady;

  return resolveMonetizationAccessSnapshot({
    billingNavEnabled,
    config,
    entitlements,
  });
}

/** @deprecated Use resolveMonetizationAccessForCheck */
export const resolveFunnelAccessForCheck = resolveMonetizationAccessForCheck;

export function isMonetizationGateOpen(
  snapshot: MonetizationAccessSnapshot,
  gate: MonetizationGateKey,
): boolean {
  return snapshot.gates[gate];
}

/** @deprecated Use isMonetizationGateOpen */
export function isBillingGateOpen(snapshot: MonetizationAccessSnapshot, gate: MonetizationGateKey): boolean {
  return isMonetizationGateOpen(snapshot, gate);
}

export async function assertMonetizationGateForCheck({
  checkId,
  gate,
  landlordId,
  useAdmin = false,
}: {
  checkId: string;
  gate: MonetizationGateKey;
  landlordId: string;
  useAdmin?: boolean;
}): Promise<
  | { allowed: true; snapshot: MonetizationAccessSnapshot }
  | { allowed: false; snapshot: MonetizationAccessSnapshot; failure: NonNullable<MonetizationPermissions["createUploadLinkBlockReason"]> | null }
> {
  const snapshot = await resolveMonetizationAccessForCheck({ checkId, landlordId, useAdmin });

  if (isMonetizationGateOpen(snapshot, gate)) {
    return { allowed: true, snapshot };
  }

  const failure = getMonetizationBlockReason(gate, snapshot.config, snapshot.entitlements);

  return { allowed: false, snapshot, failure };
}

/** @deprecated Use assertMonetizationGateForCheck */
export const assertBillingGateForCheck = assertMonetizationGateForCheck;
