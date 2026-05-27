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
  stripeScreeningPriceId: process.env.STRIPE_SCREENING_PRICE_ID ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
};

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

export function getStripeProductionReadiness() {
  return {
    hasPriceIds: hasStripePriceEnv(),
    hasPublishableKey: Boolean(env.stripePublishableKey),
    hasSecretKey: Boolean(env.stripeSecretKey),
    hasWebhookSecret: Boolean(env.stripeWebhookSecret),
    isReady: hasStripeServerEnv() && hasStripeWebhookEnv() && hasStripePriceEnv(),
  };
}
