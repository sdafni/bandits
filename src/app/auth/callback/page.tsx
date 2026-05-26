"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function getNextPath(next: string | null) {
  return next && next.startsWith("/") ? next : "/dashboard";
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => getNextPath(searchParams.get("next")), [searchParams]);
  const [message, setMessage] = useState("Finishing your SafeKey sign-in...");

  useEffect(() => {
    let isActive = true;

    async function completeAuth() {
      const supabase = createClient();
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;

      if (accessToken && refreshToken) {
        const response = await fetch("/auth/callback/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken,
            refreshToken,
          }),
        });

        if (response.ok) {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          window.location.replace(nextPath);
          return;
        }

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (isActive) {
          setMessage(payload?.error ?? "We couldn't finish your SafeKey sign-in.");
        }
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          window.location.replace(nextPath);
          return;
        }

        if (isActive) {
          setMessage(error.message);
        }
        return;
      }

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (!error) {
          window.location.replace(nextPath);
          return;
        }

        if (isActive) {
          setMessage(error.message);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        window.location.replace(nextPath);
        return;
      }

      if (isActive) {
        setMessage("The confirmation link is invalid or expired. Please request a new one.");
      }
    }

    void completeAuth();

    return () => {
      isActive = false;
    };
  }, [nextPath, searchParams]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[32px] border border-[#e5ebf3] bg-white/98 p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-950">Confirming your email</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{message}</p>
        <Link
          className="mt-6 inline-flex rounded-full border border-[#dbe2eb] bg-white px-4 py-2 text-sm font-medium text-[#0f2343] transition hover:bg-[#f7f9fc]"
          href="/login"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
