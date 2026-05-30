import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { resendConfirmationEmailAction } from "@/app/actions";
import { AuthCallbackClient } from "@/components/auth-callback-client";
import { AuthCallbackView } from "@/components/auth-callback-view";
import { notifyWelcomeEmail } from "@/lib/notifications";
import { getAuthCallbackNextPath } from "@/lib/auth-callback-path";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { withLocalePath } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

type CallbackStatus = "success" | "error" | "pending";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    code?: string;
    next?: string;
    email?: string;
  }>;
}) {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(locale, key);
  const params = await searchParams;
  const tokenHash = params.token_hash ?? null;
  const type = (params.type ?? null) as EmailOtpType | null;
  const code = params.code ?? null;
  const nextPath = getAuthCallbackNextPath(params.next ?? null, type);
  const email = params.email ?? "";
  const supabase = await createClient();

  const labels = {
    successTitle: t("auth.callback.successTitle"),
    successBody: t("auth.callback.successBody"),
    continue: t("auth.callback.continue"),
    signIn: t("auth.callback.signIn"),
    errorTitle: t("auth.callback.errorTitle"),
    errorBody: t("auth.callback.errorBody"),
    resend: t("auth.callback.resend"),
    resendPending: t("auth.callback.resendPending"),
    backToSignIn: t("auth.callback.backToSignIn"),
    email: t("auth.email"),
    verifying: t("auth.callback.verifying"),
  };

  let status: CallbackStatus = "pending";

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    status = error ? "error" : "success";
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      status = "error";
    } else {
      if (type === "signup" && email) {
        await notifyWelcomeEmail({ recipientEmail: email }).catch(() => {});
      }
      redirect(withLocalePath(locale, nextPath));
    }
  } else {
    status = "pending";
  }

  if (status === "success" && type === "signup" && email) {
    await notifyWelcomeEmail({ recipientEmail: email }).catch(() => {});
  }

  async function resendAction(formData: FormData) {
    "use server";
    await resendConfirmationEmailAction({} as never, formData);
  }

  async function completeSignupWelcomeAction(welcomeEmail: string) {
    "use server";
    await notifyWelcomeEmail({ recipientEmail: welcomeEmail }).catch(() => {});
  }

  if (status === "pending") {
    return (
      <AuthCallbackClient
        completeSignupWelcomeAction={completeSignupWelcomeAction}
        email={email}
        labels={labels}
        locale={locale}
        nextFromQuery={params.next ?? null}
        resendAction={resendAction}
      />
    );
  }

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
