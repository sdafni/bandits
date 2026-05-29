"use client";

import Link from "next/link";
import { ChevronRight, CreditCard, HelpCircle, Mail } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function AccountPageSections({
  billingNavEnabled = false,
  companyName,
  email,
  fullName,
  planStatusLabel,
  showChoosePlan = false,
}: {
  billingNavEnabled?: boolean;
  companyName?: string | null;
  email: string;
  fullName?: string | null;
  planStatusLabel: string;
  showChoosePlan?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();

  const rows = [
    {
      href: withLocalePath(locale, "/dashboard/billing"),
      icon: CreditCard,
      label: t("account.billingTitle"),
      body: t("account.billingBody"),
      show: billingNavEnabled,
    },
    {
      href: withLocalePath(locale, "/#support"),
      icon: HelpCircle,
      label: t("account.supportTitle"),
      body: t("account.supportBody"),
      show: true,
    },
    {
      href: "mailto:support@getsafekey.app",
      icon: Mail,
      label: t("account.contactTitle"),
      body: t("account.contactBody"),
      show: true,
      external: true,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/90 bg-white px-5 py-6 shadow-sm sm:px-6">
        <h2 className="text-lg font-semibold text-slate-950">{t("account.title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("account.subtitle")}</p>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">{t("account.emailLabel")}</dt>
            <dd className="mt-1 font-medium text-slate-900">{email}</dd>
          </div>
          {fullName ? (
            <div>
              <dt className="font-medium text-slate-500">{t("account.nameLabel")}</dt>
              <dd className="mt-1 font-medium text-slate-900">{fullName}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-medium text-slate-500">{t("account.planLabel")}</dt>
            <dd className="mt-1 font-medium text-slate-900">{planStatusLabel}</dd>
          </div>
        </dl>
        {showChoosePlan ? (
          <Link
            className="workspace-cta mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold sm:w-auto"
            href={withLocalePath(locale, "/dashboard/billing")}
          >
            {t("dashboard.planOnboarding.choosePlan")}
          </Link>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm sm:overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {rows
            .filter((row) => row.show)
            .map(({ href, icon: Icon, label, body, external }) => (
              <li key={label}>
                <Link
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                  href={href}
                  rel={external ? "noopener noreferrer" : undefined}
                  target={external ? "_blank" : undefined}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-600">{body}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white px-5 py-6 shadow-sm sm:px-6">
        <h3 className="text-sm font-semibold text-slate-900">{t("account.businessTitle")}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("account.businessHint")}</p>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">{t("account.companyLabel")}</dt>
            <dd className="mt-1 text-slate-700">{companyName?.trim() || t("account.placeholderSoon")}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">{t("account.vatLabel")}</dt>
            <dd className="mt-1 text-slate-700">{t("account.placeholderSoon")}</dd>
          </div>
        </dl>
      </section>

    </div>
  );
}
