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
    if (!shouldAutoCheckout || hasTriggeredRef.current) {
      return;
    }

    const form = document.getElementById(checkoutFormId) as HTMLFormElement | null;
    if (!form) {
      return;
    }

    hasTriggeredRef.current = true;
    form.requestSubmit();
  }, [checkoutFormId, shouldAutoCheckout]);

  return null;
}
