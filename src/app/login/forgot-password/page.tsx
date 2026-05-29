import type { Metadata } from "next";
import { AuthRecoveryPage } from "@/components/auth-recovery-page";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a SafeKey password reset link for your landlord workspace.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthRecoveryPage bodyKey="auth.forgotPasswordIntro" testId="forgot-password-page" titleKey="auth.forgotPasswordTitle">
      <ForgotPasswordForm />
    </AuthRecoveryPage>
  );
}
