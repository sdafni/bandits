"use client";

import { useActionState, useState } from "react";
import { signInAction, signUpAction, type ActionState } from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { SubmitButton } from "@/components/submit-button";

const initialState: ActionState = {};

export function AuthPanels() {
  const [signInState, signInFormAction] = useActionState(signInAction, initialState);
  const [signUpState, signUpFormAction] = useActionState(signUpAction, initialState);
  const [activeTab, setActiveTab] = useState<"sign_in" | "sign_up">("sign_in");

  return (
    <section className="card auth-card w-full max-w-[760px] space-y-6 border border-[#e5ebf3] bg-white/98 p-5 sm:space-y-7 sm:p-10">
      <div className="space-y-4 sm:space-y-5">
        <div className="inline-flex w-full rounded-[18px] bg-[#f7f9fc] p-1 sm:rounded-[20px]">
          <button
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[16px] px-3 py-2.5 text-sm font-semibold transition sm:min-h-12 sm:rounded-[18px] sm:px-4 sm:py-3 ${
              activeTab === "sign_in"
                ? "bg-white text-[#0f2343] shadow-[0_4px_12px_rgba(15,35,67,0.05)]"
                : "text-slate-500 hover:text-[#0f2343]"
            }`}
            onClick={() => setActiveTab("sign_in")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[16px] px-3 py-2.5 text-sm font-semibold transition sm:min-h-12 sm:rounded-[18px] sm:px-4 sm:py-3 ${
              activeTab === "sign_up"
                ? "bg-white text-[#0f2343] shadow-[0_4px_12px_rgba(15,35,67,0.05)]"
                : "text-slate-500 hover:text-[#0f2343]"
            }`}
            onClick={() => setActiveTab("sign_up")}
            type="button"
          >
            Create account
          </button>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-pretty text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[2.2rem]">
            {activeTab === "sign_in" ? "Sign in to SafeKey" : "Open your SafeKey account"}
          </h2>
          <p className="max-w-[32rem] text-[15px] leading-6 text-slate-600 sm:text-base">
            {activeTab === "sign_in"
              ? "Secure access to your verification workspace."
              : "Create your workspace and start screening securely."}
          </p>
        </div>
      </div>

      {activeTab === "sign_in" ? (
        <form action={signInFormAction} className="space-y-6">
          <div className="space-y-4">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Email</span>
              <input className="input" name="email" required type="email" />
            </label>

            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Password</span>
              <input className="input" minLength={8} name="password" required type="password" />
            </label>
          </div>

          <div className="space-y-4 pt-1">
            <FormStatusMessage state={signInState} />
            <SubmitButton className="w-full" pendingLabel="Signing in...">
              Sign in
            </SubmitButton>
          </div>
        </form>
      ) : (
        <form action={signUpFormAction} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Full name</span>
              <input className="input" name="full_name" required />
            </label>
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Company name</span>
              <input className="input" name="company_name" placeholder="Optional" />
            </label>
          </div>

          <div className="space-y-4">
            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Email</span>
              <input className="input" name="email" required type="email" />
            </label>

            <label className="space-y-2.5">
              <span className="text-sm font-medium text-[#42526b]">Password</span>
              <input className="input" minLength={8} name="password" required type="password" />
            </label>
          </div>

          <div className="space-y-4 pt-1">
            <FormStatusMessage state={signUpState} />
            <SubmitButton className="w-full" pendingLabel="Creating account...">
              Create account
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
