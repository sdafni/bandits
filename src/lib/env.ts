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
