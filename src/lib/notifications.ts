import { env, hasEmailDeliveryEnv } from "@/lib/env";

type TenantUploadInvitationInput = {
  propertyName: string;
  tenantEmail: string;
  tenantName: string;
  uploadUrl: string;
};

export async function notifyTenantUploadInvitation(input: TenantUploadInvitationInput) {
  const subject = `Secure document upload for ${input.propertyName}`;
  const text = [
    `Hello ${input.tenantName},`,
    "",
    "Your landlord invited you to submit rental verification documents through SafeKey.",
    "",
    `Property: ${input.propertyName}`,
    `Secure upload link: ${input.uploadUrl}`,
    "",
    "This link is private. Do not forward it unless you trust the recipient.",
    "",
    "SafeKey",
  ].join("\n");

  if (!hasEmailDeliveryEnv()) {
    console.info("[safekey-email:skipped]", { to: input.tenantEmail, subject });
    return { delivered: false, reason: "email_not_configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [input.tenantEmail],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[safekey-email:failed]", { status: response.status, body });
    return { delivered: false, reason: "provider_error" as const };
  }

  return { delivered: true as const };
}
