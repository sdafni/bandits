"use client";

import { PlatformPreview } from "@/components/platform-preview";
import { useT } from "@/lib/i18n/context";

export function LoginPageOps() {
  const t = useT();

  return (
    <section className="space-y-5 border-t border-[#e8edf4] pt-10 sm:pt-12">
      <div className="max-w-[36rem] space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">{t("auth.loginOpsKicker")}</p>
        <h2 className="text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.15rem]">{t("auth.loginOpsTitle")}</h2>
      </div>
      <PlatformPreview />
    </section>
  );
}
