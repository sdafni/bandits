import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/resend";
import { env, hasEmailDeliveryEnv } from "@/lib/env";

const supportMessageSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(3000),
  website: z.string().trim().max(0).optional(), // honeypot
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_MESSAGES_PER_WINDOW = 5;
const requestLog = new Map<string, number[]>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return "unknown";
}

function isRateLimited(ip: string, now: number) {
  const recent = (requestLog.get(ip) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_MESSAGES_PER_WINDOW) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = supportMessageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    if (parsed.data.website) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const now = Date.now();
    const ip = getClientIp(request);

    if (isRateLimited(ip, now)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    if (!hasEmailDeliveryEnv()) {
      console.error("[support-form] email delivery not configured");
      return NextResponse.json({ error: "email_not_configured" }, { status: 500 });
    }

    const text = [
      "New SafeKey support message",
      "",
      `Name: ${parsed.data.name}`,
      `Email: ${parsed.data.email}`,
      `Subject: ${parsed.data.subject}`,
      "",
      "Message:",
      parsed.data.message,
      "",
      `IP: ${ip}`,
      `Sent: ${new Date(now).toISOString()}`,
    ].join("\n");

    const result = await sendEmail({
      to: env.supportEmail,
      subject: `Support request: ${parsed.data.subject}`,
      replyTo: parsed.data.email,
      text,
      html: `<pre style="font-family:monospace;white-space:pre-wrap;">${text.replace(/</g, "&lt;")}</pre>`,
    });

    if (!result.delivered) {
      console.error("[support-form] resend failed", result);
      return NextResponse.json({ error: "provider_error" }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[support-form] unexpected", error);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
