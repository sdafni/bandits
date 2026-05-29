"use client";

import { Suspense, type ReactNode } from "react";
import type { AppLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/context";

function LocaleProviderBoundary({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: AppLocale;
}) {
  return <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>;
}

export function AppProviders({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: AppLocale;
}) {
  return (
    <Suspense fallback={children}>
      <LocaleProviderBoundary initialLocale={initialLocale}>{children}</LocaleProviderBoundary>
    </Suspense>
  );
}
