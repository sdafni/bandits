import type { BillingPlanKey } from "@/lib/billing";
import type { AppLocale } from "@/lib/i18n";
import { localizeHref, withLocalePath } from "@/lib/i18n";
import { sanitizeInternalPath } from "@/lib/safe-redirect";

export const START_TENANT_CHECK_PATH = "/dashboard?start=check";

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

export function buildDashboardStartCheckPath(locale: AppLocale) {
  return withLocalePath(locale, START_TENANT_CHECK_PATH);
}

export function buildStartCheckLoginHref(locale: AppLocale) {
  const nextPath = buildDashboardStartCheckPath(locale);
  return localizeHref(locale, `/login?next=${encodeURIComponent(nextPath)}`);
}

export function resolveAuthRedirectPath(nextValue: FormDataEntryValue | null, planValue: FormDataEntryValue | null) {
  const nextPath = sanitizeInternalPath(typeof nextValue === "string" ? nextValue : null);
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
