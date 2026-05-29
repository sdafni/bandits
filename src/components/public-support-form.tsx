"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";

type SubmitState = "idle" | "success" | "error";

export function PublicSupportForm() {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");

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

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <input autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="form-label">{t("support.name")}</span>
          <input className="input input--compact" name="name" required />
        </label>
        <label className="space-y-1.5">
          <span className="form-label">{t("auth.email")}</span>
          <input className="input input--compact" name="email" required type="email" />
        </label>
      </div>

      <label className="space-y-1.5">
        <span className="form-label">{t("support.subject")}</span>
        <input className="input input--compact" name="subject" required />
      </label>

      <label className="space-y-1.5">
        <span className="form-label">{t("support.message")}</span>
        <textarea className="input min-h-32 resize-y rounded-xl px-4 py-3" name="message" required />
      </label>

      <button className="primary-action min-h-12 w-full rounded-[18px] px-5 py-3 sm:w-auto" disabled={isSubmitting} type="submit">
        {isSubmitting ? t("support.sending") : t("support.send")}
      </button>

      {state === "success" ? <p className="text-sm font-medium text-emerald-700">{t("support.success")}</p> : null}
      {state === "error" ? <p className="text-sm font-medium text-rose-700">{t("support.error")}</p> : null}
    </form>
  );
}
