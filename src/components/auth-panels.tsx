"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sanitizeInternalPath } from "@/lib/safe-redirect";
import { resendConfirmationEmailAction, signInAction, signUpAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";
import { buildBillingPath, parseBillingPlanIntent } from "@/lib/billing-navigation";
import { localizeHref } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/context";

const initialState: ActionState = {};

export function AuthPanels() {
  const { locale, t } = useLocale();
  const searchParams = useSearchParams();
  const selectedPlan = parseBillingPlanIntent(searchParams.get("plan"));
  const authReason = searchParams.get("reason");
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
  const passwordMismatchError = confirmPassword && !passwordsMatch ? t("auth.passwordMismatch") : null;

  const signUpDisabled = useMemo(() => !password || !confirmPassword || !passwordsMatch, [password, confirmPassword, passwordsMatch]);

  const planLabel =
    selectedPlan === "screening"
      ? t("auth.singleScreening")
      : selectedPlan
        ? `${selectedPlan} ${t("auth.planWord")}`
        : "";

  return (
    <section
      className="card auth-card w-full max-w-[760px] space-y-6 border border-[#e5ebf3] bg-white/98 p-5 sm:space-y-7 sm:p-10"
      data-testid="auth-panels"
    >
      <div className="space-y-4 sm:space-y-5">
        <div className="inline-flex w-full rounded-[18px] bg-[#f7f9fc] p-1 sm:rounded-[20px]">
          <button
            className={`tab-action min-h-11 flex-1 gap-2 sm:min-h-12 ${
              activeTab === "sign_in"
                ? "bg-white text-[#0f2343] shadow-[0_8px_18px_rgba(15,35,67,0.07)]"
                : "text-slate-500 hover:bg-white/60 hover:text-[#0f2343]"
            }`}
            onClick={() => setActiveTab("sign_in")}
            data-testid="auth-tab-signin"
            type="button"
          >
            {t("auth.signIn")}
          </button>
          <button
            className={`tab-action min-h-11 flex-1 gap-2 sm:min-h-12 ${
              activeTab === "sign_up"
                ? "bg-white text-[#0f2343] shadow-[0_8px_18px_rgba(15,35,67,0.07)]"
                : "text-slate-500 hover:bg-white/60 hover:text-[#0f2343]"
            }`}
            onClick={() => setActiveTab("sign_up")}
            data-testid="auth-tab-signup"
            type="button"
          >
            {t("auth.signUp")}
          </button>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-pretty text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[2.2rem]">
            {activeTab === "sign_in" ? t("auth.signInTitle") : t("auth.signUpTitle")}
          </h2>
          <p className="max-w-[32rem] text-[15px] leading-6 text-slate-600 sm:text-base">
            {activeTab === "sign_in" ? t("auth.signInSubtitle") : t("auth.signUpSubtitle")}
          </p>
        </div>

        {hasPlanIntent ? (
          <div className="rounded-[22px] border border-[#e9dfc5] bg-[#fcfaf4] px-4 py-4 text-sm leading-7 text-[#5d4e31]">
            {t("auth.planIntentPrefix")} <span className="font-semibold capitalize">{planLabel}</span>
            {t("auth.planIntentSuffix")}
          </div>
        ) : null}

        {authReason === "session_expired" ? (
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
            <p className="font-semibold">{t("auth.sessionExpiredTitle")}</p>
            <p>{t("auth.sessionExpiredBody")}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button className="workspace-cta workspace-cta--compact" onClick={() => setActiveTab("sign_in")} type="button">
                {t("auth.continueSignIn")}
              </button>
              <Link className="workspace-cta-secondary workspace-cta-secondary--compact" href={localizeHref(locale, "/dashboard")}>
                {t("auth.returnDashboard")}
              </Link>
              <Link
                className="workspace-cta-secondary workspace-cta-secondary--compact"
                href={localizeHref(locale, "/dashboard#new-screening")}
              >
                {t("auth.resumeScreening")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {activeTab === "sign_in" ? (
        <form action={signInFormAction} className="space-y-6" data-testid="auth-signin-form">
          <input name="next" type="hidden" value={nextPath} />
          <div className="space-y-4">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{t("auth.email")}</span>
              <input className="input" data-testid="auth-email-input" name="email" required type="email" />
            </label>

            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{t("auth.password")}</span>
              <input
                className="input"
                data-testid="auth-password-input"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </label>
          </div>

          <p className="text-sm text-slate-600">
            <Link
              className="font-medium text-[#0f2343] underline-offset-2 hover:underline"
              href={localizeHref(locale, "/login/forgot-password")}
            >
              {t("auth.forgotPassword")}
            </Link>
          </p>

          <div className="space-y-4 pt-1">
            <FormStatusMessage state={signInState} />
            <SubmitButton className="w-full" data-testid="auth-signin-submit" pendingLabel={t("auth.signingIn")}>
              {t("auth.signIn")}
            </SubmitButton>
          </div>
        </form>
      ) : signUpCompleted ? (
        <div className="space-y-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm leading-7 text-emerald-900" data-testid="auth-signup-success">
          <p className="text-base font-semibold text-emerald-900">
            {t("auth.signupSuccessTitle")}
            <br />
            {t("auth.signupSuccessBody")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="workspace-cta min-h-12 rounded-[18px] px-5 py-3"
              onClick={() => setActiveTab("sign_in")}
              type="button"
            >
              {t("auth.goToSignIn")}
            </button>
            {confirmationEmail ? (
              <form action={resendFormAction} className="w-full sm:w-auto">
                <input name="email" type="hidden" value={confirmationEmail} />
                <SubmitButton
                  className="w-full sm:w-auto"
                  pendingLabel={t("auth.sendingConfirmation")}
                  type="submit"
                  variant="secondary"
                >
                  {t("auth.resendConfirmation")}
                </SubmitButton>
              </form>
            ) : null}
          </div>
          <FormStatusMessage state={resendState} />
        </div>
      ) : (
        <form action={signUpFormAction} className="space-y-6" data-testid="auth-signup-form">
          <input name="next" type="hidden" value={nextPath} />
          {selectedPlan ? <input name="plan" type="hidden" value={selectedPlan} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{t("auth.fullName")}</span>
              <input className="input" name="full_name" required />
            </label>
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{t("auth.companyName")}</span>
              <input className="input" name="company_name" placeholder={t("auth.optional")} />
            </label>
          </div>

          <div className="space-y-4">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{t("auth.email")}</span>
              <input
                className="input"
                name="email"
                onChange={(event) => setSignUpEmail(event.target.value)}
                required
                type="email"
              />
            </label>

            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">{t("auth.password")}</span>
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
              <span className="text-sm font-medium text-[#42526b]">{t("auth.confirmPassword")}</span>
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
              pendingLabel={t("auth.creatingAccount")}
            >
              {t("auth.signUp")}
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
