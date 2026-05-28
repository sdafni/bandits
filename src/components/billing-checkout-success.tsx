"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function BillingCheckoutSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRefreshedRef = useRef(false);
  const isSuccess = searchParams.get("checkout") === "success";

  useEffect(() => {
    if (!isSuccess || hasRefreshedRef.current) {
      return;
    }

    hasRefreshedRef.current = true;
    router.refresh();
  }, [isSuccess, router]);

  return null;
}
