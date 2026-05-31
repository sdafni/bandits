"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  forcePending?: boolean;
  name?: string;
  onClick?: () => void;
  pendingLabel?: string;
  type?: "button" | "submit";
  value?: string;
  variant?: "primary" | "secondary" | "billing" | "workspace";
};

export function SubmitButton({
  children,
  className,
  disabled = false,
  forcePending = false,
  name,
  onClick,
  pendingLabel = "Working...",
  type = "submit",
  value,
  variant = "primary",
}: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = forcePending || formPending;
  const isDisabled = pending || disabled;

  return (
    <button
      className={cn(
        variant === "billing" && "workspace-cta-secondary w-full min-h-10",
        variant === "workspace" && "workspace-cta w-full sm:w-auto",
        variant === "primary" && "primary-action min-h-14",
        variant === "secondary" && "secondary-action min-h-14",
        variant === "billing" && "min-h-12",
        "gap-2 disabled:cursor-not-allowed",
        variant === "secondary" && "disabled:opacity-70",
        pending && variant === "primary" && "cta-breathe",
        className,
      )}
      disabled={isDisabled}
      name={name}
      onClick={onClick}
      type={type}
      value={value}
    >
      {pending ? (
        <>
          <span
            className={cn(
              "h-4 w-4 animate-spin rounded-full border-2",
              variant === "primary"
                ? "border-white/30 border-t-white"
                : "border-[#0f2343]/15 border-t-[#0f2343]",
            )}
          />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
