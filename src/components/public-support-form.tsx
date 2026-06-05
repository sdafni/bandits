"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";

type SubmitState = "idle" | "success" | "error";

export function PublicSupportForm({ variant = "default" }: { variant?: "default" | "support-center" }) {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const isSupportCenter = variant === "support-center";

  const inputClass = isSupportCenter
    ? "input min-h-12 rounded-[14px] px-4 py-3 text-base"
    : "input input--compact";
  const textareaClass = isSupportCenter
    ? "input min-h-40 resize-y rounded-[14px] px-4 py-3 text-base leading-7"
    : "input min-h-32 resize-y rounded-xl px-4 py-3";
  const labelClass = isSupportCenter ? "text-sm font-semibold text-slate-800" : "form-label";
  const fieldSpacing = isSupportCenter ? "space-y-2" : "space-y-1.5";
  const formSpacing = isSupportCenter ? "space-y-5" : "space-y-3";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setState("idle");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
      website: String(formData.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("failed");
      }

      event.currentTarget.reset();
      setState("success");
    } catch {
      setState("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitLabel = isSupportCenter ? t("footer.contactSection.submit") : t("support.send");
  const pendingLabel = isSupportCenter ? t("footer.contactSection.submitPending") : t("support.sending");

  return (
    <form className={formSpacing} onSubmit={handleSubmit}>
      <input autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" />

      <div className={`grid gap-5 ${isSupportCenter ? "sm:grid-cols-2" : "gap-3 sm:grid-cols-2"}`}>
        <label className={fieldSpacing}>
          <span className={labelClass}>{t("support.name")}</span>
          <input className={inputClass} name="name" required />
        </label>
        <label className={fieldSpacing}>
          <span className={labelClass}>{t("auth.email")}</span>
          <input className={inputClass} name="email" required type="email" />
        </label>
      </div>

      <label className={fieldSpacing}>
        <span className={labelClass}>{t("support.subject")}</span>
        <input className={inputClass} name="subject" required />
      </label>

      <label className={fieldSpacing}>
        <span className={labelClass}>{t("support.message")}</span>
        <textarea className={textareaClass} name="message" required />
      </label>

      <button
        className={
          isSupportCenter
            ? "primary-action cta-breathe min-h-14 w-full rounded-[16px] px-6 py-3.5 text-base font-semibold"
            : "primary-action min-h-12 w-full rounded-[18px] px-5 py-3 sm:w-auto"
        }
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? pendingLabel : submitLabel}
      </button>

      {state === "success" ? <p className="text-base font-medium text-emerald-700">{t("support.success")}</p> : null}
      {state === "error" ? <p className="text-base font-medium text-rose-700">{t("support.error")}</p> : null}
    </form>
  );
}
