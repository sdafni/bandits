import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutForm } from "@/components/sign-out-form";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { WorkspaceRibbon } from "@/components/workspace-ribbon";
import type { AppLocale } from "@/lib/i18n";

export function AppHeader({
  actions,
  activeNav = "dashboard",
  homeHref = "/dashboard",
  subtitle,
  title,
  variant = "landlord",
  locale = "el",
}: {
  title: string;
  subtitle: string;
  homeHref?: string;
  activeNav?: "dashboard" | "billing";
  actions?: React.ReactNode;
  variant?: "landlord" | "admin";
  locale?: AppLocale;
}) {
  const isGreek = locale === "el";
  const ribbonItems =
    variant === "admin"
      ? [{ active: activeNav === "dashboard", href: homeHref, label: isGreek ? "Κέντρο ελέγχου" : "Review desk" }]
      : [
          { active: activeNav === "dashboard", href: homeHref, label: isGreek ? "Πίνακας" : "Dashboard" },
          {
            active: activeNav === "billing",
            href: "/dashboard/billing",
            label: isGreek ? "Χρέωση / Τιμολόγηση" : "Billing / Pricing",
          },
        ];

  return (
    <header className="border-b border-[#e2e8f0] bg-white/98 backdrop-blur">
      <div className="page-shell space-y-4 py-4 sm:space-y-5 sm:py-5">
        <WorkspaceRibbon items={ribbonItems} statusLabel={isGreek ? "Θωρακισμένος χώρος εργασίας" : "Institutional trust layer"} />

        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <Link
                className="hidden rounded-full border border-[#dbe2eb] bg-[#f7f9fc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b] transition hover:border-[#c5d0de] hover:bg-white sm:inline-flex"
                href={homeHref}
              >
                {isGreek ? "Χώρος εργασίας SafeKey" : "SafeKey workspace"}
              </Link>
            </div>
            <div className="flex items-start gap-3 sm:gap-4">
              <SafeKeyBrand className="mt-1 shrink-0" href={homeHref} priority variant="compact" />
              <div className="min-w-0 pl-0 sm:pl-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary sm:tracking-[0.24em]">
                  {isGreek ? "Tenant Passport Greece" : "Tenant Passport Greece"}
                </p>
                <h1 className="text-balance text-[1.45rem] font-semibold leading-tight text-primary sm:text-2xl">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-secondary sm:text-base">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            <LanguageSwitcher locale={locale} />
            {actions}
            <SignOutForm />
          </div>
        </div>
      </div>
    </header>
  );
}
