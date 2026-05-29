"use client";

import { useT } from "@/lib/i18n/context";

export function WorkspacePrimaryCta({
  labelKey = "dashboard.newCheckCta",
  onClick,
}: {
  labelKey?: "dashboard.newCheckCta" | "dashboard.welcome.cta";
  onClick: () => void;
}) {
  const t = useT();

  return (
    <button
      className="workspace-cta min-h-[3.25rem] w-full justify-center rounded-2xl text-base font-semibold sm:min-h-14"
      data-testid="dashboard-primary-cta"
      id="new-screening"
      onClick={onClick}
      type="button"
    >
      {t(labelKey)}
    </button>
  );
}
