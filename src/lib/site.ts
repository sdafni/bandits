import { env } from "@/lib/env";

export const siteConfig = {
  companyName: "SafeKey",
  defaultDescription:
    "SafeKey is AI-powered tenant screening and rental protection infrastructure built for the Greek rental market.",
  domain: "https://getsafekey.app",
  marketLine: "Built for the Greek rental market",
  ogDescription:
    "Launch tenant checks, collect documents through secure upload links, and review trusted screening and protection outcomes in one calm workflow.",
  tagline: "Trusted Tenants. Safer Rentals.",
  trustHighlights: [
    "GDPR-aware document handling",
    "Scoped access to uploaded files",
    "Secure tenant document collection",
  ],
} as const;
