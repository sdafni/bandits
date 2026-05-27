import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getCurrentUserContext } from "@/lib/auth";
import { SafeKeyBrand } from "@/components/safekey-brand";

export const metadata: Metadata = {
  title: "Choose New Password",
  description: "Set a new password for your SafeKey landlord workspace.",
};

export default async function ResetPasswordPage() {
  const { user } = await getCurrentUserContext();

  if (!user) {
    redirect("/login/forgot-password");
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg space-y-8">
        <SafeKeyBrand href="/" variant="logo" />
        <section className="card space-y-6 p-6 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-950">Choose a new password</h1>
            <p className="text-sm leading-7 text-slate-600">
              Your reset link is active. Set a new password to return to your SafeKey workspace.
            </p>
          </div>
          <ResetPasswordForm />
          <p className="text-sm text-slate-600">
            <Link className="font-medium text-[#0f2343] underline-offset-2 hover:underline" href="/login">
              Back to sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
