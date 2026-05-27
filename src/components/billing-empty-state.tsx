import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BillingEmptyState({
  className,
  description,
  icon: Icon,
  title,
}: {
  className?: string;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[24px] border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/90 to-white px-5 py-8 text-center sm:px-6 sm:py-10",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,35,67,0.05)]">
        <Icon className="h-5 w-5 text-[#5a6980]" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
