import { env } from "@/lib/env";

export const siteConfig = {
  companyName: "SafeKey",
  defaultDescription:
    "Simple tenant checks for landlords in Greece — start a check, collect documents, get a recommendation.",
  domain: "https://getsafekey.app",
  marketLine: "Built for the Greek rental market",
  ogDescription:
    "Start a tenant check, send a secure upload link, and get a clear rental recommendation.",
  tagline: "Trusted Tenants. Safer Rentals.",
  trustHighlights: [
    "GDPR-aware document handling",
    "Scoped access to uploaded files",
    "Secure tenant document collection",
  ],
} as const;
