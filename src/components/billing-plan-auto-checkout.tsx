"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { isSubscriptionPlanIntent, parseBillingPlanIntent } from "@/lib/billing-navigation";

export function BillingPlanAutoCheckout({
  checkoutFormId,
}: {
  checkoutFormId: string;
}) {
  const searchParams = useSearchParams();
  const hasTriggeredRef = useRef(false);
  const plan = parseBillingPlanIntent(searchParams.get("plan"));
  const shouldAutoCheckout = isSubscriptionPlanIntent(plan) && searchParams.get("checkout") === "auto";

  useEffect(() => {
    if (!shouldAutoCheckout || !plan || hasTriggeredRef.current) {
      return;
    }

    hasTriggeredRef.current = true;
    console.info("[safekey-checkout] client:auto:start", { plan, checkoutFormId });

    void fetch("/api/billing/subscription-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey: plan }),
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          url?: string;
          error?: string;
          detail?: string;
        } | null;

        console.info("[safekey-checkout] client:auto:response", {
          plan,
          status: response.status,
          ok: payload?.ok,
          error: payload?.error,
        });

        if (response.ok && payload?.ok && payload.url) {
          window.location.assign(payload.url);
          return;
        }

        const form = document.getElementById(checkoutFormId) as HTMLFormElement | null;
        if (form) {
          form.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      })
      .catch((error) => {
        console.error("[safekey-checkout] client:auto:error", { plan, error });
      });
  }, [checkoutFormId, plan, shouldAutoCheckout]);

  return null;
}
