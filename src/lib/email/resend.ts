import "server-only";

import { env, hasEmailDeliveryEnv } from "@/lib/env";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { delivered: true; id?: string }
  | { delivered: false; reason: "email_not_configured" | "provider_error"; detail?: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { delivered: false, reason: "provider_error", detail: "No recipients provided." };
  }

  if (!hasEmailDeliveryEnv()) {
    console.info("[safekey-email:skipped]", { to: recipients, subject: input.subject });
    return { delivered: false, reason: "email_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "SafeKey/1.0",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[safekey-email:failed]", { status: response.status, body, to: recipients, subject: input.subject });
    return { delivered: false, reason: "provider_error", detail: body.slice(0, 500) || undefined };
  }

  let id: string | undefined;
  try {
    const json = (await response.json()) as { id?: string };
    id = json.id;
  } catch {
    id = undefined;
  }

  return { delivered: true, id };
}

export async function sendTestEmail(to: string) {
  const subject = "SafeKey email test";
  const text = [
    "This is a SafeKey production email test.",
    "",
    "If you received this message, Resend is configured correctly for getsafekey.app.",
    "",
    env.appUrl,
  ].join("\n");
  const html = `
    <p style="margin:0 0 12px;color:#334155;line-height:1.6;">This is a SafeKey production email test.</p>
    <p style="margin:0 0 12px;color:#334155;line-height:1.6;">If you received this message, Resend is configured correctly for <strong>getsafekey.app</strong>.</p>
  `;

  return sendEmail({ to, subject, html, text });
}
