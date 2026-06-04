"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCallbackView } from "@/components/auth-callback-view";
import { getAuthCallbackNextPath } from "@/lib/auth-callback-path";
import { persistAuthSession } from "@/lib/persist-auth-session";
import { withLocalePath, type AppLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/browser";

type CallbackLabels = {
  successTitle: string;
  successBody: string;
  continue: string;
  signIn: string;
  errorTitle: string;
  errorBody: string;
  resend: string;
  resendPending: string;
  backToSignIn: string;
  email: string;
  verifying: string;
};

type AuthCallbackClientProps = {
  locale: AppLocale;
  email: string;
  nextFromQuery: string | null;
  labels: CallbackLabels;
  resendAction: (formData: FormData) => Promise<void>;
  completeSignupWelcomeAction: (email: string) => Promise<void>;
};

export function AuthCallbackClient({
  locale,
  email,
  nextFromQuery,
  labels,
  resendAction,
  completeSignupWelcomeAction,
}: AuthCallbackClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [nextPath, setNextPath] = useState(getAuthCallbackNextPath(nextFromQuery, null));

  useEffect(() => {
    let cancelled = false;

    async function completeCallback() {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(window.location.search);
      const callbackType = hashParams.get("type") ?? queryParams.get("type");
      const redirectPath = getAuthCallbackNextPath(queryParams.get("next") ?? nextFromQuery, callbackType);

      if (!cancelled) {
        setNextPath(redirectPath);
      }

      if (hashParams.get("error") || queryParams.get("error")) {
        if (!cancelled) {
          setStatus("error");
        }
        return;
      }

      const supabase = createClient();

      try {
        const code = queryParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) {
            return;
          }
          if (error || !data.session) {
            setStatus("error");
            return;
          }

          await persistAuthSession(data.session.access_token, data.session.refresh_token);

          if (callbackType === "signup") {
            const welcomeEmail = queryParams.get("email") ?? email;
            if (welcomeEmail) {
              await completeSignupWelcomeAction(welcomeEmail).catch(() => {});
            }
          }

          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          router.replace(withLocalePath(locale, redirectPath));
          return;
        }

        const tokenHash = queryParams.get("token_hash");
        const otpType = queryParams.get("type") as EmailOtpType | null;
        if (tokenHash && otpType) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (cancelled) {
            return;
          }
          if (error || !data.session) {
            setStatus("error");
            return;
          }

          await persistAuthSession(data.session.access_token, data.session.refresh_token);

          if (otpType === "signup") {
            const welcomeEmail = queryParams.get("email") ?? email;
            if (welcomeEmail) {
              await completeSignupWelcomeAction(welcomeEmail).catch(() => {});
            }
          }

          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          router.replace(withLocalePath(locale, redirectPath));
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (!accessToken || !refreshToken) {
          if (!cancelled) {
            setStatus("error");
          }
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (cancelled) {
          return;
        }

        if (error) {
          setStatus("error");
          return;
        }

        await persistAuthSession(accessToken, refreshToken);

        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

        if (callbackType === "signup") {
          const welcomeEmail = queryParams.get("email") ?? email;
          if (welcomeEmail) {
            await completeSignupWelcomeAction(welcomeEmail).catch(() => {});
          }
        }

        router.replace(withLocalePath(locale, redirectPath));
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void completeCallback();

    return () => {
      cancelled = true;
    };
  }, [completeSignupWelcomeAction, email, locale, nextFromQuery, router]);

  return (
    <AuthCallbackView
      email={email}
      labels={labels}
      locale={locale}
      nextPath={nextPath}
      resendAction={resendAction}
      status={status}
    />
  );
}
