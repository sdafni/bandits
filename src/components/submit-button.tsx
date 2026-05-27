"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
};

export function SubmitButton({
  children,
  className,
  pendingLabel = "Working...",
  variant = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        variant === "primary" ? "primary-action" : "secondary-action",
        "min-h-14 gap-2 disabled:cursor-not-allowed",
        variant === "secondary" && "disabled:opacity-70",
        pending && "cta-breathe",
        className,
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
