import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env, hasStripeWebhookEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { processStripeWebhookEvent } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasStripeWebhookEnv()) {
    return NextResponse.json({ error: "Stripe webhook configuration is missing." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  try {
    const result = await processStripeWebhookEvent(event);
    return NextResponse.json({ duplicate: result.duplicate, received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook processing failed." },
      { status: 500 },
    );
  }
}
