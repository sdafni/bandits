import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { resendConfirmationEmailAction } from "@/app/actions";
import { notifyWelcomeEmail } from "@/lib/notifications";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { withLocalePath } from "@/lib/i18n";
import { sanitizeInternalPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";

function getNextPath(next: string | null, type: string | null) {
  if (type === "recovery") {
    return "/login/reset-password";
  }

  return sanitizeInternalPath(next, "/dashboard");
}

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string; email?: string }>;
}) {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(locale, key);
  const params = await searchParams;
  const tokenHash = params.token_hash ?? null;
  const type = (params.type ?? null) as EmailOtpType | null;
  const nextPath = getNextPath(params.next ?? null, type);
  const email = params.email ?? "";
  const supabase = await createClient();

  let status: "success" | "error" = "error";
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    status = error ? "error" : "success";
  }

  if (status === "success" && type === "signup" && email) {
    await notifyWelcomeEmail({ recipientEmail: email }).catch(() => {});
  }

  async function resendAction(formData: FormData) {
    "use server";
    await resendConfirmationEmailAction({} as never, formData);
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[32px] border border-[#e5ebf3] bg-white/98 p-6 text-center shadow-sm sm:p-8">
        {status === "success" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{t("auth.callback.successTitle")}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{t("auth.callback.successBody")}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="workspace-cta min-h-11 rounded-[18px] px-5 py-2.5"
                data-testid="auth-callback-continue"
                href={withLocalePath(locale, nextPath)}
              >
                {t("auth.callback.continue")}
              </Link>
              <Link
                className="workspace-cta-secondary min-h-11 rounded-[18px] px-5 py-2.5"
                data-testid="auth-callback-signin"
                href={withLocalePath(locale, "/login")}
              >
                {t("auth.callback.signIn")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{t("auth.callback.errorTitle")}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{t("auth.callback.errorBody")}</p>
            <form action={resendAction} className="mx-auto mt-6 max-w-md space-y-3">
              <input
                className="input input--compact w-full"
                defaultValue={email}
                name="email"
                placeholder={t("auth.email")}
                required
                type="email"
              />
              <SubmitButton className="w-full" pendingLabel={t("auth.callback.resendPending")} variant="workspace">
                {t("auth.callback.resend")}
              </SubmitButton>
            </form>
            <Link
              className="mt-4 inline-flex rounded-full border border-[#dbe2eb] bg-white px-4 py-2 text-sm font-medium text-[#0f2343] transition hover:bg-[#f7f9fc]"
              href={withLocalePath(locale, "/login")}
            >
              {t("auth.callback.backToSignIn")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
