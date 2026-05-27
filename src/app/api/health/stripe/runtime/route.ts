import { NextResponse } from "next/server";
import { getBillingPlanPriceId, type BillingPlanKey } from "@/lib/billing";
import { env, hasStripeServerEnv } from "@/lib/env";
import { formatStripeError, logStripeKeyMode } from "@/lib/stripe-errors";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const PLANS: BillingPlanKey[] = ["basic", "pro", "premium"];

/** Server-side Stripe connectivity + price validation (no secrets exposed). */
export async function GET() {
  const result: Record<string, unknown> = {
    hasSecretKey: hasStripeServerEnv(),
    keyMode: hasStripeServerEnv() ? logStripeKeyMode(env.stripeSecretKey) : null,
    prices: {} as Record<string, unknown>,
    checkoutTest: null as unknown,
  };

  if (!hasStripeServerEnv()) {
    return NextResponse.json({ ...result, ok: false, error: "STRIPE_SECRET_KEY missing on server" });
  }

  const stripe = getStripe();

  for (const plan of PLANS) {
    const priceId = getBillingPlanPriceId(plan);
    try {
      const price = await stripe.prices.retrieve(priceId);
      result.prices = {
        ...(result.prices as Record<string, unknown>),
        [plan]: {
          priceId,
          livemode: price.livemode,
          active: price.active,
          modeMatch:
            (result.keyMode === "live" && price.livemode) || (result.keyMode === "test" && !price.livemode),
        },
      };
    } catch (error) {
      const formatted = formatStripeError(error);
      result.prices = {
        ...(result.prices as Record<string, unknown>),
        [plan]: {
          priceId,
          error: formatted.message,
          detail: formatted.detail,
        },
      };
    }
  }

  try {
    const customer = await stripe.customers.create({
      email: `runtime.check.${Date.now()}@safekey.app`,
      metadata: { source: "stripe-runtime-health" },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: getBillingPlanPriceId("pro"), quantity: 1 }],
      success_url: "https://getsafekey.app/dashboard/billing?checkout=success",
      cancel_url: "https://getsafekey.app/dashboard/billing?checkout=cancelled",
    });

    result.checkoutTest = {
      ok: Boolean(session.url),
      sessionId: session.id,
      urlHost: session.url ? new URL(session.url).host : null,
    };

    await stripe.customers.del(customer.id).catch(() => {});
  } catch (error) {
    const formatted = formatStripeError(error);
    result.checkoutTest = {
      ok: false,
      error: formatted.message,
      detail: formatted.detail,
      stripeType: "stripeType" in formatted ? formatted.stripeType : undefined,
    };
  }

  const prices = result.prices as Record<string, { modeMatch?: boolean; error?: string }>;
  const priceOk = PLANS.every((plan) => prices[plan]?.modeMatch && !prices[plan]?.error);
  const checkoutOk = Boolean((result.checkoutTest as { ok?: boolean })?.ok);

  return NextResponse.json({
    ...result,
    ok: priceOk && checkoutOk,
  });
}
