import "server-only";

import Stripe from "stripe";
import { getBillingPlanPriceId, getScreeningPriceId, type BillingPlanKey } from "@/lib/billing";
import type { Database } from "@/lib/database.types";
import { assertStripeServerEnv, env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

let stripeClient: Stripe | null = null;

export function getStripe() {
  assertStripeServerEnv();

  if (!stripeClient) {
    const secretKey = env.stripeSecretKey.trim();
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-04-22.dahlia",
      maxNetworkRetries: 1,
      timeout: 30_000,
    });
  }

  return stripeClient;
}

export async function getOrCreateStripeCustomer(user: Pick<UserRow, "company_name" | "email" | "full_name" | "id">) {
  const admin = createAdminClient();
  const { data: existingCustomer, error: existingCustomerError } = await admin
    .from("billing_customers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingCustomerError) {
    throw existingCustomerError;
  }

  if (existingCustomer) {
    return existingCustomer;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      user_id: user.id,
    },
    name: user.company_name ?? user.full_name ?? user.email,
  });

  const { data, error } = await admin
    .from("billing_customers")
    .upsert(
      {
        email: user.email,
        name: user.company_name ?? user.full_name ?? null,
        stripe_customer_id: customer.id,
        user_id: user.id,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createSubscriptionCheckoutSession({
  customerId,
  planKey,
  userId,
}: {
  customerId: string;
  planKey: BillingPlanKey;
  userId: string;
}) {
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    cancel_url: buildAppUrl(`/dashboard/billing?checkout=cancelled&plan=${planKey}`),
    client_reference_id: userId,
    customer: customerId,
    line_items: [
      {
        price: getBillingPlanPriceId(planKey),
        quantity: 1,
      },
    ],
    metadata: {
      billing_type: "subscription",
      plan_key: planKey,
      user_id: userId,
    },
    mode: "subscription",
    subscription_data: {
      metadata: {
        plan_key: planKey,
        user_id: userId,
      },
    },
    success_url: buildAppUrl("/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}"),
    tax_id_collection: {
      enabled: true,
    },
  });
}

export async function createScreeningCheckoutSession({
  checkId,
  customerId,
  userId,
}: {
  checkId: string;
  customerId: string;
  userId: string;
}) {
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    cancel_url: buildAppUrl(`/dashboard/checks/${checkId}?payment=cancelled`),
    client_reference_id: userId,
    customer: customerId,
    invoice_creation: {
      enabled: true,
    },
    line_items: [
      {
        price: getScreeningPriceId(),
        quantity: 1,
      },
    ],
    metadata: {
      billing_type: "screening",
      tenant_check_id: checkId,
      user_id: userId,
    },
    mode: "payment",
    success_url: buildAppUrl(`/dashboard/checks/${checkId}?payment=success&session_id={CHECKOUT_SESSION_ID}`),
  });
}

export async function createBillingPortalSession({
  customerId,
  returnPath = "/dashboard/billing",
}: {
  customerId: string;
  returnPath?: string;
}) {
  const stripe = getStripe();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: buildAppUrl(returnPath),
  });
}

function buildAppUrl(path: string) {
  return new URL(path, env.appUrl).toString();
}
