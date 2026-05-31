import type { MonetizationMode } from "@/lib/monetization";

function parseMonetizationModeEnv(raw: string | undefined): MonetizationMode | null {
  const normalized = raw?.trim().toUpperCase();
  if (normalized === "PREPAY" || normalized === "REPORT_UNLOCK") {
    return normalized;
  }
  if (raw?.trim() === "plan_first") {
    return "PREPAY";
  }
  if (raw?.trim() === "report_unlock") {
    return "REPORT_UNLOCK";
  }
  return null;
}

export const env = {
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production" ? "https://getsafekey.app" : "http://localhost:3000"),
  adminEmails:
    process.env.ADMIN_EMAILS
      ?.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean) ?? [],
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production" ? "https://getsafekey.app" : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  stripeBasicPriceId: process.env.STRIPE_BASIC_PRICE_ID ?? "",
  stripePremiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  stripeScreeningPriceId:
    process.env.STRIPE_SCREENING_PRICE_ID ?? process.env.STRIPE_SCREENING_ID ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: resolveEmailFromAddress(),
  stripeMerchantDisplayName: process.env.STRIPE_MERCHANT_DISPLAY_NAME ?? "ABE Studio",
  stripeStatementDescriptor: process.env.STRIPE_STATEMENT_DESCRIPTOR ?? "ABE STUDIO",
  supportEmail: process.env.SUPPORT_EMAIL ?? "blonje@gmail.com",
  legalEmail: process.env.LEGAL_EMAIL ?? process.env.SUPPORT_EMAIL ?? "blonje@gmail.com",
  billingEmail: process.env.BILLING_EMAIL ?? process.env.SUPPORT_EMAIL ?? "blonje@gmail.com",
  helloEmail: process.env.HELLO_EMAIL ?? process.env.SUPPORT_EMAIL ?? "blonje@gmail.com",
  monetizationMode: parseMonetizationModeEnv(process.env.MONETIZATION_MODE),
};

function resolveEmailFromAddress() {
  const raw =
    process.env.FROM_EMAIL?.trim() ||
    process.env.SAFEKEY_EMAIL_FROM?.trim() ||
    "";

  if (!raw) {
    return process.env.NODE_ENV === "production" ? "" : "SafeKey <onboarding@resend.dev>";
  }

  if (raw.includes("<") && raw.includes(">")) {
    return raw;
  }

  return `SafeKey <${raw}>`;
}

export function hasEmailDeliveryEnv() {
  return Boolean(env.resendApiKey && env.emailFrom);
}

export function hasOpenAiEnv() {
  return Boolean(env.openAiApiKey?.trim());
}

export function assertSupabaseBrowserEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables.");
  }
}

export function getSupabaseBrowserEnvIssue() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return "Authentication is temporarily unavailable. Please try again shortly.";
  }

  const normalizedUrl = env.supabaseUrl.trim().toLowerCase();
  const normalizedAnonKey = env.supabaseAnonKey.trim().toLowerCase();

  if (
    normalizedUrl === "https://example.com" ||
    normalizedUrl.includes("your-project-ref") ||
    normalizedAnonKey === "placeholder-anon-key" ||
    normalizedAnonKey.includes("your_public_anon_or_publishable_key")
  ) {
    return "Authentication is temporarily unavailable. Please try again shortly.";
  }

  return null;
}

export function hasSupabaseServiceEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}

export function assertSupabaseServiceEnv() {
  assertSupabaseBrowserEnv();

  if (!env.supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
}

export function hasStripeServerEnv() {
  return Boolean(env.stripeSecretKey);
}

export function assertStripeServerEnv() {
  if (!env.stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
}

export function hasStripeWebhookEnv() {
  return Boolean(env.stripeSecretKey && env.stripeWebhookSecret);
}

export function hasStripePriceEnv() {
  return Boolean(
    env.stripeBasicPriceId &&
      env.stripeProPriceId &&
      env.stripePremiumPriceId &&
      env.stripeScreeningPriceId,
  );
}

/** Checkout + billing UI: secret key and all live price IDs (matches Vercel production checklist). */
export function hasStripeCheckoutEnv() {
  return hasStripeServerEnv() && hasStripePriceEnv();
}

export function getStripeCheckoutMissingKeys() {
  const missing: string[] = [];

  if (!env.stripeSecretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }
  if (!env.stripeBasicPriceId) {
    missing.push("STRIPE_BASIC_PRICE_ID");
  }
  if (!env.stripeProPriceId) {
    missing.push("STRIPE_PRO_PRICE_ID");
  }
  if (!env.stripePremiumPriceId) {
    missing.push("STRIPE_PREMIUM_PRICE_ID");
  }
  if (!env.stripeScreeningPriceId) {
    missing.push("STRIPE_SCREENING_PRICE_ID");
  }

  return missing;
}

export function getStripeProductionReadiness() {
  return {
    hasPriceIds: hasStripePriceEnv(),
    hasPublishableKey: Boolean(env.stripePublishableKey),
    hasSecretKey: Boolean(env.stripeSecretKey),
    hasWebhookSecret: Boolean(env.stripeWebhookSecret),
    isCheckoutReady: hasStripeCheckoutEnv(),
    isReady: hasStripeCheckoutEnv() && hasStripeWebhookEnv(),
    missingCheckoutKeys: getStripeCheckoutMissingKeys(),
  };
}
