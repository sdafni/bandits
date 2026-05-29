"use client";

import { Lock, MapPin, ShieldCheck, UserCheck } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function TrustSignalsStrip({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useT();

  const signals = [
    { icon: Lock, label: t("dashboard.trust.secureCollection") },
    { icon: ShieldCheck, label: t("dashboard.trust.gdpr") },
    { icon: UserCheck, label: t("dashboard.trust.privateVerification") },
    { icon: MapPin, label: t("dashboard.trust.greece") },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3",
        compact ? "py-2.5" : "py-3.5",
        className,
      )}
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {signals.map(({ icon: Icon, label }) => (
          <li className="flex items-center gap-2 text-xs leading-5 text-slate-600 sm:text-[0.8125rem]" key={label}>
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
