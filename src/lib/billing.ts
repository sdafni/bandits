import { env } from "@/lib/env";

export type BillingPlanKey = "basic" | "pro" | "premium";
export type BillingSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";
export type BillingInvoiceStatus = "draft" | "open" | "paid" | "uncollectible" | "void";
export type BillingCheckoutMode = "subscription" | "payment";
export type BillingCheckoutStatus = "open" | "completed" | "expired" | "canceled";
export type ScreeningPaymentStatus = "pending" | "paid" | "failed" | "canceled";

export const BILLING_PLANS = [
  {
    description: "For individual landlords running occasional screening checks.",
    features: [
      "1 active tenant check at a time",
      "Secure document upload link",
      "Document status tracking",
      "Final recommendation view",
    ],
    featured: false,
    key: "basic",
    name: "Basic",
    priceLabel: "€19/month",
    shortPrice: "€19",
  },
  {
    description: "For active landlords and agents who need a steady screening workflow.",
    features: [
      "Up to 10 active tenant checks",
      "Dashboard risk score overview",
      "Faster case turnaround",
      "Priority product support",
    ],
    featured: true,
    key: "pro",
    name: "Pro",
    priceLabel: "€49/month",
    shortPrice: "€49",
  },
  {
    description: "For property managers and teams running screening as an operational process.",
    features: [
      "Unlimited active tenant checks",
      "Team-style operational workflow",
      "Priority review queue",
      "Premium support and onboarding",
    ],
    featured: false,
    key: "premium",
    name: "Premium",
    priceLabel: "€149/month",
    shortPrice: "€149",
  },
] as const satisfies ReadonlyArray<{
  description: string;
  features: readonly string[];
  featured: boolean;
  key: BillingPlanKey;
  name: string;
  priceLabel: string;
  shortPrice: string;
}>;

export const SCREENING_PAYMENT_PRODUCT = {
  description: "One-off payment to unlock a screening report for a single tenant case.",
  features: [
    "Purchase from any active tenant case",
    "Unlock report generation for that case",
    "No monthly plan required",
  ],
  name: "Single screening",
  priceLabel: "Pay per screening",
} as const;

const PRICE_IDS: Record<BillingPlanKey, string> = {
  basic: env.stripeBasicPriceId,
  premium: env.stripePremiumPriceId,
  pro: env.stripeProPriceId,
};

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<BillingSubscriptionStatus>(["active", "trialing", "past_due"]);

export function getBillingPlan(key: BillingPlanKey) {
  return BILLING_PLANS.find((plan) => plan.key === key) ?? BILLING_PLANS[0];
}

export const WORKSPACE_ACCESS_LABEL = "Trial Workspace";

export function getBillingPlanName(key: BillingPlanKey | null | undefined) {
  if (!key) {
    return WORKSPACE_ACCESS_LABEL;
  }

  return getBillingPlan(key).name;
}

export function getWorkspaceBillingLabel(options: {
  hasActiveSubscription: boolean;
  planKey?: BillingPlanKey | null;
}) {
  if (options.hasActiveSubscription && options.planKey) {
    return getBillingPlan(options.planKey).name;
  }

  return WORKSPACE_ACCESS_LABEL;
}

export function getSubscriptionStatusBadge(hasActiveSubscription: boolean) {
  return hasActiveSubscription ? "Active" : "Starter access";
}

export function getBillingPlanPriceId(key: BillingPlanKey) {
  const priceId = PRICE_IDS[key];

  if (!priceId) {
    throw new Error(`Missing Stripe price configuration for the ${key} plan.`);
  }

  return priceId;
}

export function getScreeningPriceId() {
  if (!env.stripeScreeningPriceId) {
    throw new Error("Missing Stripe price configuration for one-time screening payments.");
  }

  return env.stripeScreeningPriceId;
}

export function getPlanKeyFromPriceId(priceId: string | null | undefined): BillingPlanKey | null {
  if (!priceId) {
    return null;
  }

  return (
    (Object.entries(PRICE_IDS).find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0] as BillingPlanKey | undefined) ??
    null
  );
}

export function isEntitledSubscriptionStatus(status: string | null | undefined): status is BillingSubscriptionStatus {
  return ENTITLED_SUBSCRIPTION_STATUSES.has((status ?? "") as BillingSubscriptionStatus);
}

export function formatStripeAmount(amountInMinorUnit: number | null | undefined, currency = "eur") {
  if (amountInMinorUnit == null) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-GB", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amountInMinorUnit / 100);
}
