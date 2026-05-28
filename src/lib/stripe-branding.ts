import { env } from "@/lib/env";

/** Merchant identity shown in Stripe Checkout and on card statements. */
export const STRIPE_MERCHANT_DISPLAY_NAME = env.stripeMerchantDisplayName;

/** Max 22 characters for card statement descriptors. */
export const STRIPE_STATEMENT_DESCRIPTOR = env.stripeStatementDescriptor;

export const LEGACY_STRIPE_MERCHANT_NAMES = ["Peloponnese Property Hub", "Peloponnese", "Property Hub"] as const;

export function getCheckoutBrandingSettings() {
  return {
    display_name: STRIPE_MERCHANT_DISPLAY_NAME,
  };
}

export function getCheckoutSessionMetadata(
  fields: Record<string, string | undefined | null>,
): Record<string, string> {
  return {
    merchant_display_name: STRIPE_MERCHANT_DISPLAY_NAME,
    platform: "SafeKey",
    ...Object.fromEntries(
      Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
  };
}

export function normalizeStripeProductName(name: string) {
  let normalized = name;

  for (const legacy of LEGACY_STRIPE_MERCHANT_NAMES) {
    normalized = normalized.replace(new RegExp(legacy, "gi"), STRIPE_MERCHANT_DISPLAY_NAME);
  }

  return normalized.trim();
}
