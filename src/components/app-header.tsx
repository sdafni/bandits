import Link from "next/link";
import { SignOutForm } from "@/components/sign-out-form";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { WorkspaceRibbon } from "@/components/workspace-ribbon";

export function AppHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-[#e2e8f0] bg-white/98 backdrop-blur">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <WorkspaceRibbon
          items={[
            { active: true, label: "Workspace" },
            { label: "Verification flow" },
            { label: "Review operations" },
          ]}
          statusLabel="Institutional trust layer"
        />

        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <Link
                className="hidden rounded-full border border-[#dbe2eb] bg-[#f7f9fc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b] sm:inline-flex"
                href="/"
              >
                SafeKey workspace
              </Link>
            </div>
            <div className="flex items-start gap-3 sm:gap-4">
              <SafeKeyBrand className="mt-1 shrink-0 sm:hidden" href="/" variant="compact" />
              <SafeKeyBrand className="hidden shrink-0 sm:inline-flex" href="/" priority variant="logo" />
              <div className="min-w-0 pl-0 sm:pl-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5a6980]">
                  Tenant Passport Greece
                </p>
                <h1 className="text-balance text-[1.7rem] font-semibold leading-tight text-slate-950 sm:text-2xl">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
            <SignOutForm />
          </div>
        </div>
      </div>
    </header>
  );
}
