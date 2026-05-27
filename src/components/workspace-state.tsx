import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Clock3, Inbox, LoaderCircle, SearchX } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type WorkspaceStateVariant = "empty" | "filter" | "pending" | "success" | "error" | "loading";

type WorkspaceStateProps = {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  description: string;
  title: string;
  variant: WorkspaceStateVariant;
};

const VARIANTS: Record<
  WorkspaceStateVariant,
  { icon: LucideIcon; iconClassName: string; panelClassName: string }
> = {
  empty: {
    icon: Inbox,
    iconClassName: "text-[#183454]",
    panelClassName: "border-dashed border-slate-300 bg-slate-50/90",
  },
  error: {
    icon: AlertTriangle,
    iconClassName: "text-rose-700",
    panelClassName: "border-rose-200 bg-rose-50/80",
  },
  filter: {
    icon: SearchX,
    iconClassName: "text-[#5d4e31]",
    panelClassName: "border-dashed border-slate-300 bg-slate-50/90",
  },
  loading: {
    icon: LoaderCircle,
    iconClassName: "animate-spin text-[#183454]",
    panelClassName: "border-slate-200 bg-white",
  },
  pending: {
    icon: Clock3,
    iconClassName: "text-[#8b6b17]",
    panelClassName: "border-[#e9dfc5] bg-[#fcfaf4]",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-700",
    panelClassName: "border-emerald-200 bg-emerald-50/80",
  },
};

export function WorkspaceState({
  actionHref,
  actionLabel,
  className,
  description,
  title,
  variant,
}: WorkspaceStateProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-[28px] border px-6 py-10 text-center transition",
        config.panelClassName,
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        <Icon className={cn("h-5 w-5", config.iconClassName)} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-700">{description}</p>
      {actionHref && actionLabel ? (
        <Link className="workspace-cta mt-6" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
