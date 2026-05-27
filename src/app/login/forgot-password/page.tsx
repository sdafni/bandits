import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SafeKeyBrand } from "@/components/safekey-brand";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a SafeKey password reset link for your landlord workspace.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg space-y-8">
        <SafeKeyBrand href="/" variant="logo" />
        <section className="card space-y-6 p-6 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-950">Reset your password</h1>
            <p className="text-sm leading-7 text-slate-600">
              Enter the email tied to your SafeKey account. We&apos;ll send a secure reset link if the account exists.
            </p>
          </div>
          <ForgotPasswordForm />
          <p className="text-sm text-slate-600">
            Remembered your password?{" "}
            <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href="/login">
              Back to sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
