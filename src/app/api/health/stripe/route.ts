import { NextResponse } from "next/server";
import { getStripeProductionReadiness } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Public readiness check (names only, never secret values). */
export async function GET() {
  const readiness = getStripeProductionReadiness();
  let webhookEventsLast24h = 0;
  let webhookFailuresLast24h = 0;
  let webhookSyncHealthy = false;

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ count: total }, { count: failed }] = await Promise.all([
      admin
        .from("stripe_webhook_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      admin
        .from("stripe_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", since),
    ]);

    webhookEventsLast24h = total ?? 0;
    webhookFailuresLast24h = failed ?? 0;
    webhookSyncHealthy = webhookEventsLast24h === 0 || webhookFailuresLast24h === 0;
  } catch {
    webhookSyncHealthy = false;
  }

  return NextResponse.json({
    checkoutReady: readiness.isCheckoutReady,
    hasSecretKey: readiness.hasSecretKey,
    hasPriceIds: readiness.hasPriceIds,
    hasWebhookSecret: readiness.hasWebhookSecret,
    missingCheckoutKeys: readiness.missingCheckoutKeys,
    webhookEventsLast24h,
    webhookFailuresLast24h,
    webhookSyncHealthy,
  });
}
