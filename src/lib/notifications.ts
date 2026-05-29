import { env, hasEmailDeliveryEnv } from "@/lib/env";

type TenantUploadInvitationInput = {
  propertyName: string;
  tenantEmail: string;
  tenantName: string;
  uploadUrl: string;
};

type WelcomeEmailInput = {
  recipientEmail: string;
  fullName?: string | null;
};

export async function notifyTenantUploadInvitation(input: TenantUploadInvitationInput) {
  const subject = `SafeKey secure upload invitation · ${input.propertyName}`;
  const text = [
    `Γεια σου ${input.tenantName},`,
    "",
    "Μόλις έλαβες ασφαλή πρόσκληση από το SafeKey για υποβολή εγγράφων ενοικίασης.",
    "",
    `Ακίνητο: ${input.propertyName}`,
    `Ασφαλής σύνδεσμος υποβολής: ${input.uploadUrl}`,
    "",
    "Ο σύνδεσμος είναι ιδιωτικός. Μην τον κοινοποιήσεις σε τρίτους.",
    "",
    "SafeKey Trust Operations",
  ].join("\n");
  const html = `
  <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:580px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f2343;">SafeKey</p>
      <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Secure tenant upload invitation</h1>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(input.tenantName)}, your landlord invited you to submit requested screening documents securely.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Property:</strong> ${escapeHtml(input.propertyName)}</p>
      <a href="${input.uploadUrl}" style="display:inline-block;background:#0f2343;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;">Open secure upload page</a>
      <p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.5;">This link is private and time-limited. If anything looks unexpected, contact your landlord before sharing documents.</p>
    </div>
  </div>`;

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
      html,
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

export async function notifyWelcomeEmail(input: WelcomeEmailInput) {
  const firstName = input.fullName?.trim()?.split(" ")[0] ?? "there";
  const subject = "Welcome to SafeKey";
  const text = [
    `Hello ${firstName},`,
    "",
    "Welcome to SafeKey.",
    "Your account is now ready. You can continue to your dashboard and start your first tenant check.",
    "",
    `${env.appUrl}/dashboard`,
    "",
    "SafeKey Trust Operations",
  ].join("\n");
  const html = `
  <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:580px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f2343;">SafeKey</p>
      <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Welcome to SafeKey</h1>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(firstName)}, your account is ready.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">SafeKey helps you run secure tenant checks and receive your SafeKey Report with a calm, clear workflow.</p>
      <a href="${env.appUrl}/dashboard" style="display:inline-block;background:#0f2343;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;">Open dashboard</a>
    </div>
  </div>`;

  if (!hasEmailDeliveryEnv()) {
    console.info("[safekey-email:skipped]", { to: input.recipientEmail, subject });
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
      to: [input.recipientEmail],
      subject,
      html,
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
