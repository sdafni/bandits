import Link from "next/link";
import { SignOutForm } from "@/components/sign-out-form";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { WorkspaceRibbon } from "@/components/workspace-ribbon";

export function AppHeader({
  actions,
  activeNav = "dashboard",
  homeHref = "/dashboard",
  subtitle,
  title,
  variant = "landlord",
}: {
  title: string;
  subtitle: string;
  homeHref?: string;
  activeNav?: "dashboard" | "billing";
  actions?: React.ReactNode;
  variant?: "landlord" | "admin";
}) {
  const ribbonItems =
    variant === "admin"
      ? [{ active: activeNav === "dashboard", href: homeHref, label: "Review desk" }]
      : [
          { active: activeNav === "dashboard", href: homeHref, label: "Dashboard" },
          { active: activeNav === "billing", href: "/dashboard/billing", label: "Billing / Pricing" },
        ];

  return (
    <header className="border-b border-[#e2e8f0] bg-white/98 backdrop-blur">
      <div className="page-shell space-y-4 py-4 sm:space-y-5 sm:py-5">
        <WorkspaceRibbon items={ribbonItems} statusLabel="Institutional trust layer" />

        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <Link
                className="hidden rounded-full border border-[#dbe2eb] bg-[#f7f9fc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b] transition hover:border-[#c5d0de] hover:bg-white sm:inline-flex"
                href={homeHref}
              >
                SafeKey workspace
              </Link>
            </div>
            <div className="flex items-start gap-3 sm:gap-4">
              <SafeKeyBrand className="mt-1 shrink-0 sm:hidden" href={homeHref} variant="compact" />
              <SafeKeyBrand className="hidden shrink-0 sm:inline-flex" href={homeHref} priority variant="logo" />
              <div className="min-w-0 pl-0 sm:pl-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary sm:tracking-[0.24em]">
                  Tenant Passport Greece
                </p>
                <h1 className="text-balance text-[1.45rem] font-semibold leading-tight text-primary sm:text-2xl">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-secondary sm:text-base">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {variant === "landlord" ? (
              <Link
                className="secondary-action min-h-12 rounded-[18px] px-5 py-3"
                href="/dashboard/billing"
              >
                Billing / Pricing
              </Link>
            ) : null}
            {actions}
            <SignOutForm />
          </div>
        </div>
      </div>
    </header>
  );
}
