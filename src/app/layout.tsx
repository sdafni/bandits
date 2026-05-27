import type { Metadata } from "next";
import { env } from "@/lib/env";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "SafeKey",
  authors: [{ name: "SafeKey" }],
  category: "technology",
  creator: "SafeKey",
  publisher: "SafeKey",
  title: {
    default: "SafeKey | Trusted Tenants. Safer Rentals.",
    template: "%s | SafeKey",
  },
  description: siteConfig.defaultDescription,
  metadataBase: new URL(env.siteUrl),
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  icons: {
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    icon: [{ url: "/icon", type: "image/png" }],
    shortcut: ["/icon"],
  },
  keywords: [
    "SafeKey",
    "tenant screening Greece",
    "Greek rental market",
    "rental protection",
    "tenant verification",
    "proptech Greece",
    "document screening workflow",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    description: siteConfig.ogDescription,
    images: [
      {
        alt: "SafeKey social preview",
        height: 630,
        url: "/opengraph-image",
        width: 1200,
      },
    ],
    locale: "en_GB",
    siteName: "SafeKey",
    title: "SafeKey | Trusted Tenants. Safer Rentals.",
    type: "website",
    url: env.siteUrl,
  },
  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    description: siteConfig.ogDescription,
    images: ["/twitter-image"],
    title: "SafeKey | Trusted Tenants. Safer Rentals.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
