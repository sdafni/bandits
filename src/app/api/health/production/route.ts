import { NextResponse } from "next/server";
import {
  getStripeProductionReadiness,
  hasEmailDeliveryEnv,
  hasSupabaseServiceEnv,
} from "@/lib/env";

export const dynamic = "force-dynamic";

/** Public operational readiness (no secret values). */
export async function GET() {
  const stripe = getStripeProductionReadiness();

  return NextResponse.json({
    uploadsReady: hasSupabaseServiceEnv(),
    emailReady: hasEmailDeliveryEnv(),
    stripeCheckoutReady: stripe.isCheckoutReady,
    stripeWebhookReady: stripe.hasWebhookSecret,
    stripeMissingCheckoutKeys: stripe.missingCheckoutKeys,
  });
}
