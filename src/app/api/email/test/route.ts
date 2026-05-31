import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTestEmail } from "@/lib/email/resend";
import { env, hasEmailDeliveryEnv, hasSupabaseServiceEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const testEmailSchema = z.object({
  to: z.string().trim().email().max(200),
});

function authorizeServiceRequest(request: Request) {
  if (!hasSupabaseServiceEnv()) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${env.supabaseServiceRoleKey}`;
}

/** GET — email readiness (no secrets). */
export async function GET() {
  return NextResponse.json({
    emailReady: hasEmailDeliveryEnv(),
    fromConfigured: Boolean(env.emailFrom),
    resendConfigured: Boolean(env.resendApiKey),
  });
}

/** POST — send a test email (service-role auth only). */
export async function POST(request: Request) {
  if (!authorizeServiceRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasEmailDeliveryEnv()) {
    return NextResponse.json(
      {
        error: "email_not_configured",
        missing: [
          !env.resendApiKey ? "RESEND_API_KEY" : null,
          !env.emailFrom ? "FROM_EMAIL" : null,
        ].filter(Boolean),
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = testEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await sendTestEmail(parsed.data.to);
  if (!result.delivered) {
    return NextResponse.json(
      { error: result.reason, detail: "detail" in result ? result.detail : undefined },
      { status: result.reason === "email_not_configured" ? 503 : 502 },
    );
  }

  return NextResponse.json({ ok: true, id: result.id ?? null });
}
