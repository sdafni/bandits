import Link from "next/link";
import { withLocalePath, type AppLocale } from "@/lib/i18n";
import { SubmitButton } from "@/components/submit-button";

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

type AuthCallbackViewProps = {
  locale: AppLocale;
  status: "success" | "error" | "pending";
  nextPath: string;
  email: string;
  labels: CallbackLabels;
  resendAction: (formData: FormData) => Promise<void>;
};

export function AuthCallbackView({
  locale,
  status,
  nextPath,
  email,
  labels,
  resendAction,
}: AuthCallbackViewProps) {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[32px] border border-[#e5ebf3] bg-white/98 p-6 text-center shadow-sm sm:p-8">
        {status === "pending" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{labels.verifying}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{labels.successBody}</p>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{labels.successTitle}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{labels.successBody}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="workspace-cta min-h-11 rounded-[18px] px-5 py-2.5"
                data-testid="auth-callback-continue"
                href={withLocalePath(locale, nextPath)}
              >
                {labels.continue}
              </Link>
              <Link
                className="workspace-cta-secondary min-h-11 rounded-[18px] px-5 py-2.5"
                data-testid="auth-callback-signin"
                href={withLocalePath(locale, "/login")}
              >
                {labels.signIn}
              </Link>
            </div>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{labels.errorTitle}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{labels.errorBody}</p>
            <form action={resendAction} className="mx-auto mt-6 max-w-md space-y-3">
              <input
                className="input input--compact w-full"
                defaultValue={email}
                name="email"
                placeholder={labels.email}
                required
                type="email"
              />
              <SubmitButton className="w-full" pendingLabel={labels.resendPending} variant="workspace">
                {labels.resend}
              </SubmitButton>
            </form>
            <Link
              className="mt-4 inline-flex rounded-full border border-[#dbe2eb] bg-white px-4 py-2 text-sm font-medium text-[#0f2343] transition hover:bg-[#f7f9fc]"
              href={withLocalePath(locale, "/login")}
            >
              {labels.backToSignIn}
            </Link>
          </>
        ) : null}
      </div>
    </main>
  );
}
