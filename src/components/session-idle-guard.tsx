"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const WARNING_AFTER_MS = 25 * 60 * 1000;
const EXPIRE_AFTER_MS = 30 * 60 * 1000;

export function SessionIdleGuard() {
  const [lastActivityAt, setLastActivityAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const remainingSeconds = useMemo(() => Math.max(0, Math.floor((EXPIRE_AFTER_MS - (now - lastActivityAt)) / 1000)), [lastActivityAt, now]);

  useEffect(() => {
    const markActive = () => setLastActivityAt(Date.now());
    const events: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "touchstart", "scroll"];
    for (const eventName of events) {
      window.addEventListener(eventName, markActive, { passive: true });
    }

    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      const elapsed = currentTime - lastActivityAt;
      setNow(currentTime);
      if (elapsed >= EXPIRE_AFTER_MS) {
        const path = window.location.pathname;
        const localeMatch = path.match(/^\/(el|en)(\/|$)/);
        const localePrefix = localeMatch ? `/${localeMatch[1]}` : "";
        window.location.href = `${localePrefix}/login?reason=session_expired`;
        return;
      }
      setShowWarning(elapsed >= WARNING_AFTER_MS);
    }, 15000);

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, markActive);
      }
      window.clearInterval(timer);
    };
  }, [lastActivityAt]);

  async function staySignedIn() {
    try {
      setIsRefreshing(true);
      const supabase = createClient();
      await supabase.auth.getSession();
      setLastActivityAt(Date.now());
      setShowWarning(false);
    } finally {
      setIsRefreshing(false);
    }
  }

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 sm:items-center sm:justify-center sm:p-6">
      <section aria-modal="true" className="w-full rounded-t-2xl bg-white p-4 sm:max-w-md sm:rounded-2xl" role="dialog">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Session warning</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">Your session will expire soon due to inactivity.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Keep working to avoid interruption. Time remaining: about {remainingSeconds}s.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="workspace-cta" disabled={isRefreshing} onClick={staySignedIn} type="button">
            {isRefreshing ? "Refreshing..." : "Stay signed in"}
          </button>
          <button className="workspace-cta-secondary" onClick={() => setShowWarning(false)} type="button">
            Continue working
          </button>
        </div>
      </section>
    </div>
  );
}
