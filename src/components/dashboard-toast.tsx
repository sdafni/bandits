"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function DashboardToast({
  message,
  onDismiss,
  tone = "success",
}: {
  message: string;
  onDismiss: () => void;
  tone?: "success" | "neutral";
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg sm:left-auto sm:right-6",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-900",
      )}
      role="status"
    >
      {message}
    </div>
  );
}
