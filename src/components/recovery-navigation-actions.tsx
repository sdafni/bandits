"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function RecoveryNavigationActions({
  showResume = false,
}: {
  showResume?: boolean;
}) {
  const router = useRouter();
  const [isRoutingHome, setIsRoutingHome] = useState(false);

  async function handleReturnHome() {
    try {
      setIsRoutingHome(true);
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      router.push(data.user ? "/dashboard" : "/");
    } catch {
      router.push("/");
    } finally {
      setIsRoutingHome(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
      <button className="workspace-cta" disabled={isRoutingHome} onClick={handleReturnHome} type="button">
        {isRoutingHome ? "Opening..." : "Return home"}
      </button>
      <button className="workspace-cta-secondary" onClick={() => router.push("/login")} type="button">
        Sign in
      </button>
      {showResume ? (
        <button className="workspace-cta-secondary" onClick={() => router.push("/dashboard#new-screening")} type="button">
          Resume tenant check
        </button>
      ) : null}
    </div>
  );
}
