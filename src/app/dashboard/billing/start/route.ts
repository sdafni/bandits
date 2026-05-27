import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { startSubscriptionCheckoutForUser } from "@/lib/billing-checkout";
import { isSubscriptionPlanIntent, parseBillingPlanIntent } from "@/lib/billing-navigation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const plan = parseBillingPlanIntent(url.searchParams.get("plan"));

  console.info("[safekey-checkout] route:GET /dashboard/billing/start", { plan });

  if (!isSubscriptionPlanIntent(plan)) {
    redirect("/dashboard/billing");
  }

  try {
    const result = await startSubscriptionCheckoutForUser(plan, "api");

    if (!result.ok) {
      console.warn("[safekey-checkout] route:start:failed", {
        plan,
        error: result.error,
        detail: result.detail,
      });
      redirect(`/dashboard/billing?plan=${plan}&checkout=error`);
    }

    redirect(result.url);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[safekey-checkout] route:start:unexpected", error);
    redirect(`/dashboard/billing?plan=${plan}&checkout=error`);
  }
}
