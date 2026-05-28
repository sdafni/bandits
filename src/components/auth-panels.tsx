"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sanitizeInternalPath } from "@/lib/safe-redirect";
import { resendConfirmationEmailAction, signInAction, signUpAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { buildBillingPath, parseBillingPlanIntent } from "@/lib/billing-navigation";
import { detectLocaleFromPath } from "@/lib/i18n";

const initialState: ActionState = {};

export function AuthPanels() {
  const pathname = usePathname();
  const locale = detectLocaleFromPath(pathname) ?? "el";
  const isGreek = locale === "el";
  const searchParams = useSearchParams();
  const selectedPlan = parseBillingPlanIntent(searchParams.get("plan"));
  const nextPath = sanitizeInternalPath(
    searchParams.get("next") ??
      (selectedPlan ? buildBillingPath(selectedPlan, { autoCheckout: selectedPlan !== "screening" }) : null),
  );
  const hasPlanIntent = Boolean(selectedPlan);
  const [signInState, signInFormAction] = useActionState(signInAction, initialState);
  const [signUpState, signUpFormAction] = useActionState(signUpAction, initialState);
  const [resendState, resendFormAction] = useActionState(resendConfirmationEmailAction, initialState);
  const [activeTab, setActiveTab] = useState<"sign_in" | "sign_up">(hasPlanIntent ? "sign_up" : "sign_in");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");

  const signUpCompleted = signUpState.kind === "signup_success";
  const confirmationEmail = signUpState.email ?? signUpEmail;
  const passwordsMatch = password === confirmPassword;
  const passwordMismatchError = confirmPassword && !passwordsMatch ? "Passwords do not match." : null;

  const signUpDisabled = useMemo(() => !password || !confirmPassword || !passwordsMatch, [password, confirmPassword, passwordsMatch]);

  return (
    <section className="card auth-card w-full max-w-[760px] space-y-6 border border-[#e5ebf3] bg-white/98 p-5 sm:space-y-7 sm:p-10">
      <div className="space-y-4 sm:space-y-5">
        <div className="inline-flex w-full rounded-[18px] bg-[#f7f9fc] p-1 sm:rounded-[20px]">
          <button
            className={`tab-action min-h-11 flex-1 gap-2 sm:min-h-12 ${
              activeTab === "sign_in"
                ? "bg-white text-[#0f2343] shadow-[0_8px_18px_rgba(15,35,67,0.07)]"
                : "text-slate-500 hover:bg-white/60 hover:text-[#0f2343]"
            }`}
            onClick={() => setActiveTab("sign_in")}
            type="button"
          >
            {isGreek ? "Σύνδεση" : "Sign in"}
          </button>
          <button
            className={`tab-action min-h-11 flex-1 gap-2 sm:min-h-12 ${
              activeTab === "sign_up"
                ? "bg-white text-[#0f2343] shadow-[0_8px_18px_rgba(15,35,67,0.07)]"
                : "text-slate-500 hover:bg-white/60 hover:text-[#0f2343]"
            }`}
            onClick={() => setActiveTab("sign_up")}
            type="button"
          >
            {isGreek ? "Δημιουργία λογαριασμού" : "Create account"}
          </button>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-pretty text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[2.2rem]">
            {activeTab === "sign_in"
              ? isGreek
                ? "Σύνδεση στο SafeKey"
                : "Sign in to SafeKey"
              : isGreek
                ? "Άνοιξε τον λογαριασμό σου στο SafeKey"
                : "Open your SafeKey account"}
          </h2>
          <p className="max-w-[32rem] text-[15px] leading-6 text-slate-600 sm:text-base">
            {activeTab === "sign_in"
              ? isGreek
                ? "Ασφαλής πρόσβαση στον χώρο ελέγχων σου."
                : "Secure access to your verification workspace."
              : isGreek
                ? "Δημιούργησε χώρο εργασίας και ξεκίνα ασφαλείς ελέγχους."
                : "Create your workspace and start screening securely."}
          </p>
        </div>

        {hasPlanIntent ? (
          <div className="rounded-[22px] border border-[#e9dfc5] bg-[#fcfaf4] px-4 py-4 text-sm leading-7 text-[#5d4e31]">
            {isGreek ? "Ξεκινάς με" : "You&apos;re starting with"}{" "}
            <span className="font-semibold capitalize">
              {selectedPlan === "screening"
                ? isGreek
                  ? "μεμονωμένο έλεγχο"
                  : "single screening"
                : `${selectedPlan} ${isGreek ? "πλάνο" : "plan"}`}
            </span>
            {isGreek
              ? ". Μετά τη σύνδεση, το SafeKey θα σε μεταφέρει στη χρέωση και θα ξεκινήσει checkout όπου απαιτείται."
              : ". After authentication, SafeKey will take you to billing and start checkout when applicable."}
          </div>
        ) : null}
      </div>

      {activeTab === "sign_in" ? (
        <form action={signInFormAction} className="space-y-6">
          <input name="next" type="hidden" value={nextPath} />
          <div className="space-y-4">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{isGreek ? "Email" : "Email"}</span>
              <input className="input" name="email" required type="email" />
            </label>

            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{isGreek ? "Κωδικός" : "Password"}</span>
              <input className="input" minLength={8} name="password" required type="password" />
            </label>
          </div>

          <p className="text-sm text-slate-600">
            <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href="/login/forgot-password">
              {isGreek ? "Ξέχασες τον κωδικό;" : "Forgot password?"}
            </Link>
          </p>

          <div className="space-y-4 pt-1">
            <FormStatusMessage state={signInState} />
            <SubmitButton className="w-full" pendingLabel={isGreek ? "Σύνδεση..." : "Signing in..."}>
              {isGreek ? "Σύνδεση" : "Sign in"}
            </SubmitButton>
          </div>
        </form>
      ) : signUpCompleted ? (
        <div className="space-y-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm leading-7 text-emerald-900">
          <p className="text-base font-semibold text-emerald-900">
            Account created successfully.
            <br />
            Please check your email to confirm your account, then sign in.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="workspace-cta min-h-12 rounded-[18px] px-5 py-3"
              onClick={() => setActiveTab("sign_in")}
              type="button"
            >
              Go to sign in
            </button>
            {confirmationEmail ? (
              <form action={resendFormAction} className="w-full sm:w-auto">
                <input name="email" type="hidden" value={confirmationEmail} />
                <SubmitButton className="w-full sm:w-auto" pendingLabel="Sending..." type="submit" variant="secondary">
                  Resend confirmation email
                </SubmitButton>
              </form>
            ) : null}
          </div>
          <FormStatusMessage state={resendState} />
        </div>
      ) : (
        <form action={signUpFormAction} className="space-y-6">
          <input name="next" type="hidden" value={nextPath} />
          {selectedPlan ? <input name="plan" type="hidden" value={selectedPlan} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{isGreek ? "Ονοματεπώνυμο" : "Full name"}</span>
              <input className="input" name="full_name" required />
            </label>
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{isGreek ? "Εταιρική επωνυμία" : "Company name"}</span>
              <input className="input" name="company_name" placeholder={isGreek ? "Προαιρετικό" : "Optional"} />
            </label>
          </div>

          <div className="space-y-4">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Email</span>
              <input
                className="input"
                name="email"
                onChange={(event) => setSignUpEmail(event.target.value)}
                required
                type="email"
              />
            </label>

            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{isGreek ? "Κωδικός" : "Password"}</span>
              <input
                className="input"
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Confirm password</span>
              <input
                className="input"
                minLength={8}
                name="confirm_password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          </div>

          <div className="space-y-4 pt-1">
            {passwordMismatchError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {passwordMismatchError}
              </p>
            ) : null}
            <FormStatusMessage state={signUpState} />
            <SubmitButton
              className="w-full"
              disabled={signUpDisabled}
              pendingLabel={isGreek ? "Δημιουργία λογαριασμού..." : "Creating account..."}
            >
              {isGreek ? "Δημιουργία λογαριασμού" : "Create account"}
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
