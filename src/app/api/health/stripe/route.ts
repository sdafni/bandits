import { NextResponse } from "next/server";
import { getStripeProductionReadiness } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Public readiness check (names only, never secret values). */
export async function GET() {
  const readiness = getStripeProductionReadiness();

  return NextResponse.json({
    checkoutReady: readiness.isCheckoutReady,
    hasSecretKey: readiness.hasSecretKey,
    hasPriceIds: readiness.hasPriceIds,
    hasWebhookSecret: readiness.hasWebhookSecret,
    missingCheckoutKeys: readiness.missingCheckoutKeys,
  });
}
