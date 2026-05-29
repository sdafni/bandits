"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function AuthRecoveryPage({
  children,
  testId,
  titleKey,
  bodyKey,
}: {
  children: ReactNode;
  testId: string;
  titleKey: string;
  bodyKey: string;
}) {
  const { locale } = useLocale();
  const t = useT();

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SafeKeyBrand href={withLocalePath(locale, "/")} variant="logo" />
          <LanguageSwitcher />
        </div>
        <section className="card space-y-6 p-6 sm:p-8" data-testid={testId}>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-950">{t(titleKey)}</h1>
            <p className="text-sm leading-7 text-slate-600">{t(bodyKey)}</p>
          </div>
          {children}
          <p className="text-sm text-slate-600">
            {t("auth.rememberedPassword")}{" "}
            <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href={withLocalePath(locale, "/login")}>
              {t("auth.backToSignIn")}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
