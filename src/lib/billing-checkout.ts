import "server-only";

import { getLandlordContextForApi, requireLandlord } from "@/lib/auth";
import { isEntitledSubscriptionStatus, type BillingPlanKey } from "@/lib/billing";
import { getBillingOverviewForUser, isBillingSchemaReady } from "@/lib/billing-queries";
import { hasStripeServerEnv } from "@/lib/env";
import { formatStripeError, logStripeKeyMode } from "@/lib/stripe-errors";
import {
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getOrCreateStripeCustomer,
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type CheckoutResult =
  | { ok: true; url: string; mode: "checkout" | "portal" }
  | { ok: false; error: string; detail?: string };

export async function startSubscriptionCheckoutForUser(
  planKey: BillingPlanKey,
  source: "action" | "api" = "action",
): Promise<CheckoutResult> {
  console.info("[safekey-checkout] subscription:start", {
    planKey,
    source,
    stripeKeyMode: hasStripeServerEnv() ? logStripeKeyMode(env.stripeSecretKey) : "missing",
  });

  if (!hasStripeServerEnv()) {
    return {
      ok: false,
      error: "Billing is not configured yet. Add the Stripe server keys before enabling checkout.",
    };
  }

  if (!(await isBillingSchemaReady({ admin: true }))) {
    return {
      ok: false,
      error: "Billing database tables are not deployed yet. Apply the latest Supabase billing migrations.",
    };
  }

  try {
    const landlordContext =
      source === "api" ? await getLandlordContextForApi() : await requireLandlord();

    if (!landlordContext) {
      return { ok: false, error: "Sign in required to start checkout." };
    }

    const { profile } = landlordContext;
    console.info("[safekey-checkout] subscription:landlord", { userId: profile.id, source });

    const overview = await getBillingOverviewForUser(profile.id, { admin: true });
    const customer = overview.customer ?? (await getOrCreateStripeCustomer(profile));

    console.info("[safekey-checkout] subscription:customer", {
      stripeCustomerId: customer.stripe_customer_id,
      hasActiveSubscription: Boolean(overview.activeSubscription),
      source,
    });

    if (overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status)) {
      console.info("[safekey-checkout] subscription:portal", { source });
      const portalSession = await createBillingPortalSession({
        customerId: customer.stripe_customer_id,
      });

      if (!portalSession.url) {
        return { ok: false, error: "Stripe billing portal could not be opened." };
      }

      console.info("[safekey-checkout] subscription:portal:ready", { source });
      return { ok: true, url: portalSession.url, mode: "portal" };
    }

    console.info("[safekey-checkout] subscription:stripe-session:create", { planKey, source });
    const session = await createSubscriptionCheckoutSession({
      customerId: customer.stripe_customer_id,
      planKey,
      userId: profile.id,
    });

    console.info("[safekey-checkout] subscription:stripe-session:created", {
      sessionId: session.id,
      source,
    });

    const admin = createAdminClient();
    const { error: upsertError } = await admin.from("billing_checkout_sessions").upsert(
      {
        amount_total: session.amount_total,
        cancel_url: session.cancel_url,
        completed_at: null,
        currency: session.currency,
        mode: "subscription",
        payment_status: session.payment_status,
        plan_key: planKey,
        status: "open",
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customer.stripe_customer_id,
        stripe_subscription_id:
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
        success_url: session.success_url,
        tenant_check_id: null,
        user_id: profile.id,
      },
      { onConflict: "stripe_checkout_session_id" },
    );

    if (upsertError) {
      console.error("[safekey-checkout] subscription:db-upsert-failed", {
        message: upsertError.message,
        source,
      });
    }

    if (!session.url) {
      return { ok: false, error: "Stripe checkout could not be created for this plan." };
    }

    console.info("[safekey-checkout] subscription:ready", { sessionId: session.id, source });
    return { ok: true, url: session.url, mode: "checkout" };
  } catch (error) {
    const formatted = formatStripeError(error);
    console.error("[safekey-checkout] subscription:failed", {
      source,
      message: formatted.message,
      detail: formatted.detail,
      stripeType: "stripeType" in formatted ? formatted.stripeType : undefined,
    });

    return {
      ok: false,
      error: formatted.message,
      detail: formatted.detail,
    };
  }
}
