"use client";

import { useCallback, useState } from "react";
import type { BillingPlanKey } from "@/lib/billing";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/app/actions";

type CheckoutApiResponse = {
  ok: boolean;
  url?: string;
  error?: string;
  detail?: string;
  mode?: "checkout" | "portal";
};

export function SubscriptionCheckoutForm({
  className,
  formId,
  label,
  pendingLabel,
  planKey,
  variant = "workspace",
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
  formId?: string;
  label: string;
  pendingLabel: string;
  planKey: BillingPlanKey;
  variant?: "primary" | "secondary" | "billing" | "workspace";
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, setPending] = useState(false);

  const runCheckout = useCallback(async () => {
    if (disabled || pending) {
      console.warn("[safekey-checkout] client:subscription:blocked", { disabled, pending, planKey });
      return;
    }

    setState({});
    setPending(true);
    console.info("[safekey-checkout] client:subscription:start", { planKey });

    try {
      const response = await fetch("/api/billing/subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
        credentials: "same-origin",
      });

      const payload = (await response.json().catch(() => null)) as CheckoutApiResponse | null;
      console.info("[safekey-checkout] client:subscription:response", {
        planKey,
        status: response.status,
        ok: payload?.ok,
        mode: payload?.mode,
        error: payload?.error,
        detail: payload?.detail,
      });

      if (response.ok && payload?.ok && payload.url) {
        console.info("[safekey-checkout] client:subscription:redirect", { planKey, mode: payload.mode });
        window.location.assign(payload.url);
        return;
      }

      const message = payload?.error ?? "Stripe checkout could not be started.";
      const detail = payload?.detail;
      setState({ error: detail ? `${message} (${detail})` : message });
    } catch (error) {
      console.error("[safekey-checkout] client:subscription:network-error", { planKey, error });
      setState({
        error:
          error instanceof Error
            ? `Network error starting checkout: ${error.message}`
            : "Network error starting checkout. Try again.",
      });
    } finally {
      setPending(false);
    }
  }, [disabled, pending, planKey]);

  return (
    <form
      className="space-y-2"
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        void runCheckout();
      }}
    >
      <SubmitButton
        className={className}
        disabled={disabled}
        forcePending={pending}
        pendingLabel={pendingLabel}
        variant={variant}
      >
        {label}
      </SubmitButton>
      <FormStatusMessage state={state} />
    </form>
  );
}
