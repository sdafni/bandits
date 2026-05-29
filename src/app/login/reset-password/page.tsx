import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthRecoveryPage } from "@/components/auth-recovery-page";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getCurrentUserContext } from "@/lib/auth";
import { withLocalePath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Choose New Password",
  description: "Set a new password for your SafeKey landlord workspace.",
};

export default async function ResetPasswordPage() {
  const locale = await getRequestLocale();
  const { user } = await getCurrentUserContext();

  if (!user) {
    redirect(withLocalePath(locale, "/login/forgot-password"));
  }

  return (
    <AuthRecoveryPage bodyKey="auth.resetPasswordIntro" testId="reset-password-page" titleKey="auth.resetPasswordTitle">
      <ResetPasswordForm />
    </AuthRecoveryPage>
  );
}
