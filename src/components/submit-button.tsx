"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
};

export function SubmitButton({ children, className, pendingLabel = "Working..." }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        "inline-flex min-h-14 items-center justify-center rounded-[20px] border border-[#102947] bg-[#0f2343] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,35,67,0.08)] transition hover:bg-[#102947] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f2343]/12 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
