import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireLandlord } from "@/lib/auth";
import { getBillingOverviewForUser, isBillingSchemaReady } from "@/lib/billing-queries";
import { isEntitledSubscriptionStatus } from "@/lib/billing";
import { hasStripeServerEnv } from "@/lib/env";
import { isSubscriptionPlanIntent, parseBillingPlanIntent } from "@/lib/billing-navigation";
import {
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getOrCreateStripeCustomer,
} from "@/lib/stripe";

export async function GET(request: Request) {
  const { profile } = await requireLandlord();
  const url = new URL(request.url);
  const plan = parseBillingPlanIntent(url.searchParams.get("plan"));

  if (!isSubscriptionPlanIntent(plan)) {
    redirect("/dashboard/billing");
  }

  if (!hasStripeServerEnv()) {
    redirect("/dashboard/billing?checkout=unconfigured");
  }

  if (!(await isBillingSchemaReady({ admin: true }))) {
    redirect("/dashboard/billing?checkout=schema");
  }

  try {
    const overview = await getBillingOverviewForUser(profile.id, { admin: true });
    const customer = overview.customer ?? (await getOrCreateStripeCustomer(profile));

    if (overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status)) {
      const portalSession = await createBillingPortalSession({
        customerId: customer.stripe_customer_id,
      });
      redirect(portalSession.url);
    }

    const session = await createSubscriptionCheckoutSession({
      customerId: customer.stripe_customer_id,
      planKey: plan,
      userId: profile.id,
    });

    if (!session.url) {
      redirect(`/dashboard/billing?plan=${plan}&checkout=error`);
    }

    redirect(session.url);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(`/dashboard/billing?plan=${plan}&checkout=error`);
  }
}
