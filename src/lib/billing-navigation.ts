import type { BillingPlanKey } from "@/lib/billing";

export type BillingPlanIntent = BillingPlanKey | "screening";

export function parseBillingPlanIntent(value: string | null | undefined): BillingPlanIntent | null {
  if (value === "basic" || value === "pro" || value === "premium" || value === "screening") {
    return value;
  }

  return null;
}

export function isSubscriptionPlanIntent(
  plan: BillingPlanIntent | null,
): plan is BillingPlanKey {
  return plan === "basic" || plan === "pro" || plan === "premium";
}

export function buildBillingPath(
  plan: BillingPlanIntent,
  options?: { autoCheckout?: boolean },
) {
  const params = new URLSearchParams({ plan });
  if (options?.autoCheckout && plan !== "screening") {
    params.set("checkout", "auto");
  }

  return `/dashboard/billing?${params.toString()}`;
}

export function buildLoginHref(plan: BillingPlanIntent) {
  const nextPath = buildBillingPath(plan, { autoCheckout: plan !== "screening" });
  const params = new URLSearchParams({
    next: nextPath,
    plan,
  });

  return `/login?${params.toString()}`;
}

export function resolveAuthRedirectPath(nextValue: FormDataEntryValue | null, planValue: FormDataEntryValue | null) {
  const nextPath = typeof nextValue === "string" && nextValue.trim().startsWith("/") ? nextValue.trim() : "/dashboard";
  const plan = parseBillingPlanIntent(typeof planValue === "string" ? planValue : null);

  if (!plan) {
    return nextPath;
  }

  if (nextPath.startsWith("/dashboard/billing")) {
    const url = new URL(nextPath, "http://localhost");
    if (!url.searchParams.get("plan")) {
      url.searchParams.set("plan", plan);
    }
    if (plan !== "screening" && !url.searchParams.get("checkout")) {
      url.searchParams.set("checkout", "auto");
    }
    return `${url.pathname}${url.search}`;
  }

  return buildBillingPath(plan, { autoCheckout: plan !== "screening" });
}
