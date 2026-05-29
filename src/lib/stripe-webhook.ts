import "server-only";

import type Stripe from "stripe";
import { getPlanKeyFromPriceId, type BillingPlanKey } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

export async function processStripeWebhookEvent(event: Stripe.Event) {
  const admin = createAdminClient();
  const { data: existingEvent } = await admin
    .from("stripe_webhook_events")
    .select("id, status")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent?.status === "processed" || existingEvent?.status === "duplicate") {
    return { duplicate: true as const };
  }

  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    event_type: event.type,
    status: "processing",
    stripe_event_id: event.id,
  });

  if (insertError?.code === "23505") {
    return { duplicate: true as const };
  }

  if (insertError) {
    throw insertError;
  }

  try {
    await handleStripeEvent(event);

    await admin
      .from("stripe_webhook_events")
      .update({
        processed_at: new Date().toISOString(),
        status: "processed",
      })
      .eq("stripe_event_id", event.id);

    return { duplicate: false as const };
  } catch (error) {
    await admin
      .from("stripe_webhook_events")
      .update({
        error_message: error instanceof Error ? error.message : "Stripe webhook handler failed.",
        status: "failed",
      })
      .eq("stripe_event_id", event.id);

    throw error;
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await syncCheckoutSession(event.data.object as Stripe.Checkout.Session, true);
      return;
    case "checkout.session.expired":
      await syncCheckoutSession(event.data.object as Stripe.Checkout.Session, false, "expired");
      return;
    case "checkout.session.async_payment_failed":
      await syncCheckoutSession(event.data.object as Stripe.Checkout.Session, false, "failed");
      return;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      return;
    case "invoice.created":
    case "invoice.finalized":
    case "invoice.updated":
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    case "invoice.voided":
      await syncInvoice(event.data.object as Stripe.Invoice);
      return;
    case "payment_intent.payment_failed":
      await syncPaymentIntentFailure(event.data.object as Stripe.PaymentIntent);
      return;
    default:
      return;
  }
}

async function syncCheckoutSession(
  session: Stripe.Checkout.Session,
  completed: boolean,
  failureMode: "expired" | "failed" | null = null,
) {
  if (session.mode !== "subscription" && session.mode !== "payment") {
    return;
  }

  const admin = createAdminClient();
  const userId = session.metadata?.user_id ?? session.client_reference_id ?? null;
  const customerId = getIdFromExpandable(session.customer);

  if (!userId || !customerId) {
    return;
  }

  const checkoutStatus = completed
    ? "completed"
    : failureMode === "expired"
      ? "expired"
      : "canceled";

  await admin.from("billing_checkout_sessions").upsert(
    {
      amount_total: session.amount_total,
      cancel_url: session.cancel_url,
      completed_at: completed ? new Date().toISOString() : null,
      currency: session.currency,
      mode: session.mode,
      payment_status: session.payment_status,
      plan_key: normalizePlanKey(session.metadata?.plan_key),
      status: checkoutStatus,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: customerId,
      stripe_payment_intent_id: getIdFromExpandable(session.payment_intent),
      stripe_subscription_id: getIdFromExpandable(session.subscription),
      success_url: session.success_url,
      tenant_check_id: session.metadata?.tenant_check_id ?? null,
      user_id: userId,
    },
    { onConflict: "stripe_checkout_session_id" },
  );

  await upsertBillingCustomer({
    email: session.customer_details?.email ?? session.customer_email ?? null,
    name: session.customer_details?.name ?? null,
    stripeCustomerId: customerId,
    userId,
  });

  if (session.mode === "payment" && session.metadata?.billing_type === "screening" && session.metadata.tenant_check_id) {
    const screeningStatus =
      completed && session.payment_status === "paid"
        ? "paid"
        : failureMode === "failed"
          ? "failed"
          : "canceled";

    await admin.from("screening_payments").upsert(
      {
        amount_total: session.amount_total,
        currency: session.currency ?? "eur",
        paid_at: screeningStatus === "paid" ? new Date().toISOString() : null,
        status: screeningStatus,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: getIdFromExpandable(session.payment_intent),
        tenant_check_id: session.metadata.tenant_check_id,
        user_id: userId,
      },
      { onConflict: "tenant_check_id" },
    );

    if (screeningStatus === "paid" && session.metadata.tenant_check_id) {
      const { activateTenantWorkflowForCheck } = await import("@/lib/workflow-activation");
      await activateTenantWorkflowForCheck(session.metadata.tenant_check_id).catch(() => undefined);
    }
  }

  if (completed && session.mode === "subscription") {
    const subscriptionId = getIdFromExpandable(session.subscription);
    if (subscriptionId) {
      const stripe = await import("@/lib/stripe").then((module) => module.getStripe());
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
    }
  }
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId = getIdFromExpandable(subscription.customer);

  if (!customerId) {
    return;
  }

  const { data: existingCustomer } = await admin
    .from("billing_customers")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const userId = subscription.metadata.user_id ?? existingCustomer?.user_id ?? null;

  if (!userId) {
    return;
  }

  const firstItem = subscription.items.data[0];
  const subscriptionWindow = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
    current_period_start?: number | null;
  };
  const { data: existingSubscription } = await admin
    .from("billing_subscriptions")
    .select("plan_key")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const planKey =
    getPlanKeyFromPriceId(firstItem?.price.id) ??
    normalizePlanKey(subscription.metadata.plan_key) ??
    existingSubscription?.plan_key ??
    null;

  if (!planKey) {
    return;
  }

  await admin.from("billing_subscriptions").upsert(
    {
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: timestampFromUnix(subscriptionWindow.current_period_end),
      current_period_start: timestampFromUnix(subscriptionWindow.current_period_start),
      metadata: subscription.metadata,
      plan_key: planKey,
      status: subscription.status,
      stripe_customer_id: customerId,
      stripe_price_id: firstItem?.price.id ?? null,
      stripe_product_id: getIdFromExpandable(firstItem?.price.product),
      stripe_subscription_id: subscription.id,
      trial_end: timestampFromUnix(subscription.trial_end),
      trial_start: timestampFromUnix(subscription.trial_start),
      user_id: userId,
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function syncInvoice(invoice: Stripe.Invoice) {
  const admin = createAdminClient();
  const customerId = getIdFromExpandable(invoice.customer);

  if (!customerId) {
    return;
  }

  const { data: customer } = await admin
    .from("billing_customers")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!customer) {
    return;
  }

  const period = invoice.lines.data[0]?.period;
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: { id: string } | string | null;
  };

  await admin.from("billing_invoices").upsert(
    {
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency ?? "eur",
      due_date: timestampFromUnix(invoice.due_date),
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_created_at: timestampFromUnix(invoice.created),
      invoice_pdf: invoice.invoice_pdf,
      paid_at: invoice.status === "paid" ? new Date().toISOString() : null,
      period_end: timestampFromUnix(period?.end),
      period_start: timestampFromUnix(period?.start),
      status: normalizeInvoiceStatus(invoice.status),
      stripe_customer_id: customerId,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: getIdFromExpandable(invoiceWithSubscription.subscription),
      subtotal: invoice.subtotal,
      total: invoice.total,
      user_id: customer.user_id,
    },
    { onConflict: "stripe_invoice_id" },
  );
}

async function syncPaymentIntentFailure(paymentIntent: Stripe.PaymentIntent) {
  const admin = createAdminClient();
  await Promise.all([
    admin
      .from("screening_payments")
      .update({ status: "failed" })
      .eq("stripe_payment_intent_id", paymentIntent.id),
    admin
      .from("billing_checkout_sessions")
      .update({ payment_status: paymentIntent.status, status: "canceled" })
      .eq("stripe_payment_intent_id", paymentIntent.id),
  ]);
}

async function upsertBillingCustomer({
  email,
  name,
  stripeCustomerId,
  userId,
}: {
  email: string | null;
  name: string | null;
  stripeCustomerId: string;
  userId: string;
}) {
  const admin = createAdminClient();
  await admin.from("billing_customers").upsert(
    {
      email: email ?? `${userId}@billing.safekey.local`,
      name,
      stripe_customer_id: stripeCustomerId,
      user_id: userId,
    },
    { onConflict: "user_id" },
  );
}

function getIdFromExpandable(value: { id: string } | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function normalizePlanKey(value: string | null | undefined): BillingPlanKey | null {
  return value === "basic" || value === "pro" || value === "premium" ? value : null;
}

function normalizeInvoiceStatus(
  status: Stripe.Invoice.Status | null,
): "draft" | "open" | "paid" | "uncollectible" | "void" {
  if (status === "open" || status === "paid" || status === "uncollectible" || status === "void") {
    return status;
  }

  return "draft";
}

function timestampFromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}
