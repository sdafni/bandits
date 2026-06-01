import { NextResponse } from "next/server";
import { getBillingPlanPriceId, type BillingPlanKey } from "@/lib/billing";
import { env, hasStripeServerEnv, hasSupabaseServiceEnv } from "@/lib/env";
import { formatStripeError, logStripeKeyMode } from "@/lib/stripe-errors";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const PLANS: BillingPlanKey[] = ["basic", "pro", "premium"];
const PRODUCTION_WEBHOOK_URL = "https://getsafekey.app/api/stripe/webhook";
const STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.created",
  "invoice.finalized",
  "invoice.updated",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.voided",
  "payment_intent.payment_failed",
] as const;

function authorizeServiceBootstrap(request: Request) {
  if (!hasSupabaseServiceEnv()) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${env.supabaseServiceRoleKey}`;
}

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
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      cancel_url: "https://getsafekey.app/dashboard/billing?checkout=cancelled&plan=pro",
      customer: customer.id,
      customer_update: {
        address: "auto",
        name: "auto",
      },
      line_items: [{ price: getBillingPlanPriceId("pro"), quantity: 1 }],
      mode: "subscription",
      success_url: "https://getsafekey.app/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      tax_id_collection: { enabled: true },
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

/** Service-role bootstrap: ensure live webhook endpoint exists (returns signing secret once). */
export async function POST(request: Request) {
  if (!authorizeServiceBootstrap(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasStripeServerEnv()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY missing on server" }, { status: 500 });
  }

  const recreate = new URL(request.url).searchParams.get("recreate") === "1";
  const stripe = getStripe();
  const listed = await stripe.webhookEndpoints.list({ limit: 100 });
  let endpoint = listed.data.find((item) => item.url === PRODUCTION_WEBHOOK_URL);

  if (endpoint && recreate) {
    await stripe.webhookEndpoints.del(endpoint.id);
    endpoint = undefined;
  }

  if (endpoint) {
    return NextResponse.json({
      action: "exists",
      id: endpoint.id,
      status: endpoint.status,
      url: endpoint.url,
      message:
        "Webhook already registered. Use ?recreate=1 to rotate signing secret, then set STRIPE_WEBHOOK_SECRET in Vercel.",
    });
  }

  try {
    const created = await stripe.webhookEndpoints.create({
      url: PRODUCTION_WEBHOOK_URL,
      description: "SafeKey production billing webhook",
      enabled_events: [...STRIPE_WEBHOOK_EVENTS],
    });

    return NextResponse.json({
      action: "created",
      id: created.id,
      url: created.url,
      signingSecret: created.secret,
      nextStep: "Add signingSecret to Vercel STRIPE_WEBHOOK_SECRET for Production and Preview, then redeploy.",
    });
  } catch (error) {
    const formatted = formatStripeError(error);
    return NextResponse.json(
      {
        error: formatted.message,
        detail: formatted.detail,
      },
      { status: 500 },
    );
  }
}
