import type { BillingPlanKey } from "@/lib/billing";
import type { AppLocale } from "@/lib/i18n";
import { localizeHref, withLocalePath } from "@/lib/i18n";
import { sanitizeInternalPath } from "@/lib/safe-redirect";
import type { SiteAuthState } from "@/lib/site-auth-state";

export const START_TENANT_CHECK_PATH = "/dashboard?start=check";
export const PRIMARY_CONVERSION_NEXT_PATH = "/dashboard";

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
  return localizeHref(locale, `/login?next=${encodeURIComponent(START_TENANT_CHECK_PATH)}`);
}

export function buildSignupLoginHref(locale: AppLocale, nextPath = PRIMARY_CONVERSION_NEXT_PATH) {
  const params = new URLSearchParams({
    tab: "signup",
    next: nextPath,
  });

  return localizeHref(locale, `/login?${params.toString()}#auth`);
}

export function buildPrimaryConversionHref(locale: AppLocale, auth: SiteAuthState) {
  if (auth.isAuthenticated) {
    return withLocalePath(locale, PRIMARY_CONVERSION_NEXT_PATH);
  }

  return buildSignupLoginHref(locale);
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
