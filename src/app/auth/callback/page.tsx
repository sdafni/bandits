import { resendConfirmationEmailAction } from "@/app/actions";
import { AuthCallbackClient } from "@/components/auth-callback-client";
import { AuthCallbackView } from "@/components/auth-callback-view";
import { notifyWelcomeEmail } from "@/lib/notifications";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

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
  const code = params.code ?? null;
  const email = params.email ?? "";

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

  async function resendAction(formData: FormData) {
    "use server";
    await resendConfirmationEmailAction({} as never, formData);
  }

  async function completeSignupWelcomeAction(welcomeEmail: string) {
    "use server";
    await notifyWelcomeEmail({ recipientEmail: welcomeEmail }).catch(() => {});
  }

  if (tokenHash || code) {
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
      nextPath="/login"
      resendAction={resendAction}
      status="error"
    />
  );
}
