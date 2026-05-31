"use client";

import Link from "next/link";
import { ChevronRight, CreditCard, HelpCircle, Mail, Receipt } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

export function AccountPageSections({
  billingNavEnabled = false,
  email,
  fullName,
  planStatusLabel,
}: {
  billingNavEnabled?: boolean;
  email: string;
  fullName?: string | null;
  planStatusLabel: string;
}) {
  const t = useT();
  const { locale } = useLocale();

  const rows = [
    {
      href: withLocalePath(locale, "/dashboard/billing"),
      icon: CreditCard,
      label: t("account.planSelectionTitle"),
      body: t("account.planSelectionBody"),
      show: billingNavEnabled,
    },
    {
      href: withLocalePath(locale, "/dashboard/billing"),
      icon: Receipt,
      label: t("account.paymentManagementTitle"),
      body: t("account.paymentManagementBody"),
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
    </div>
  );
}
