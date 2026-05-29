import "server-only";

import { getBillingOverviewForUser } from "@/lib/billing-queries";
import { getStripeProductionReadiness } from "@/lib/env";

export async function resolveBillingNavEnabled(userId: string) {
  try {
    const overview = await getBillingOverviewForUser(userId);
    const stripeReadiness = getStripeProductionReadiness();
    return stripeReadiness.isCheckoutReady && overview.schemaReady;
  } catch {
    return false;
  }
}
