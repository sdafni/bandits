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
export type BillingPlanLimits = {
  activeChecks: number;
  completedChecksPerMonth: number;
};

export const BILLING_PLANS = [
  {
    description: "For landlords with 1–2 properties and a few checks a month.",
    features: [
      "1 active tenant check at a time",
      "Max 3 completed checks per month",
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
    description: "For active landlords who run checks regularly.",
    features: [
      "Up to 10 active tenant checks",
      "Max 25 completed checks per month",
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
    description: "For managers and teams with many properties.",
    features: [
      "Up to 40 active tenant checks",
      "Max 100 completed checks per month",
      "Built for multiple properties",
      "Faster review",
      "Priority support",
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
  priceLabel: "€39 per check",
  shortPrice: "€39",
} as const;

export const ENTERPRISE_CONTACT_PRODUCT = {
  description: "For agencies and companies that need custom volume, API access, and multi-team operations.",
  features: [
    "Custom pricing",
    "Higher volume limits",
    "API / multi-agent workspace",
    "Dedicated support",
    "Contact us",
  ],
  name: "Enterprise / Agency",
  priceLabel: "Custom",
} as const;

const PRICE_IDS: Record<BillingPlanKey, string> = {
  basic: env.stripeBasicPriceId,
  premium: env.stripePremiumPriceId,
  pro: env.stripeProPriceId,
};

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<BillingSubscriptionStatus>(["active", "trialing", "past_due"]);
const PLAN_LIMITS: Record<BillingPlanKey, BillingPlanLimits> = {
  basic: { activeChecks: 1, completedChecksPerMonth: 3 },
  pro: { activeChecks: 10, completedChecksPerMonth: 25 },
  premium: { activeChecks: 40, completedChecksPerMonth: 100 },
};

export function getBillingPlan(key: BillingPlanKey) {
  return BILLING_PLANS.find((plan) => plan.key === key) ?? BILLING_PLANS[0];
}

export function getBillingPlanLimits(key: BillingPlanKey | null | undefined): BillingPlanLimits {
  return PLAN_LIMITS[key ?? "basic"];
}

export const WORKSPACE_ACCESS_LABEL = "Starter plan";

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
  return hasActiveSubscription ? "Active" : "Starter plan";
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
