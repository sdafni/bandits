import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type RibbonItem = {
  label: string;
  href?: string;
  active?: boolean;
};

export function WorkspaceRibbon({
  items,
  statusLabel = "Secure workspace",
  className,
}: {
  items: RibbonItem[];
  statusLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[#e6ebf2] pb-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="-mx-1 flex items-center gap-2.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {items.map((item) =>
          item.href ? (
            <Link
              className={cn(
                "shrink-0 whitespace-nowrap text-xs font-medium transition",
                item.active
                  ? "text-[#0f2343]"
                  : "text-[#5a6980] hover:text-[#0f2343]",
              )}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-xs font-medium",
                item.active ? "text-[#0f2343]" : "text-[#5a6980]",
              )}
              key={item.label}
            >
              {item.label}
            </span>
          ),
        )}
      </div>

      <div className="inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#183454]" />
        {statusLabel}
      </div>
    </div>
  );
}
