import type { Metadata } from "next";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "SafeKey",
  title: {
    default: "SafeKey",
    template: "%s | SafeKey",
  },
  description:
    "SafeKey is AI-powered tenant screening and rental protection infrastructure for the Greek rental market.",
  metadataBase: new URL(env.siteUrl),
  alternates: {
    canonical: "/",
  },
  icons: {
    apple: "/brand/safekey/icon/safekey-icon.png",
    icon: "/brand/safekey/icon/safekey-icon.png",
    shortcut: "/brand/safekey/icon/safekey-icon.png",
  },
  openGraph: {
    description:
      "SafeKey combines tenant screening, risk scoring, insurance eligibility, and rental protection packaging in one trusted workflow.",
    siteName: "SafeKey",
    title: "SafeKey",
    type: "website",
    url: env.siteUrl,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
