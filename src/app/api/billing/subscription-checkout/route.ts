import { NextResponse } from "next/server";
import { z } from "zod";
import { startSubscriptionCheckoutForUser } from "@/lib/billing-checkout";
import type { BillingPlanKey } from "@/lib/billing";

const bodySchema = z.object({
  planKey: z.enum(["basic", "pro", "premium"]),
});

export async function POST(request: Request) {
  console.info("[safekey-checkout] api:POST /api/billing/subscription-checkout");

  try {
    let planKey: BillingPlanKey;

    try {
      const json = await request.json();
      const parsed = bodySchema.safeParse(json);

      if (!parsed.success) {
        console.warn("[safekey-checkout] api:invalid-body", parsed.error.flatten());
        return NextResponse.json(
          { ok: false, error: "Invalid plan. Choose basic, pro, or premium." },
          { status: 400 },
        );
      }

      planKey = parsed.data.planKey;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }

    const result = await startSubscriptionCheckoutForUser(planKey, "api");

    if (!result.ok) {
      console.warn("[safekey-checkout] api:failed", {
        planKey,
        error: result.error,
        detail: result.detail,
      });
      const status = result.error.includes("Sign in required") ? 401 : 502;
      return NextResponse.json(result, { status });
    }

    console.info("[safekey-checkout] api:success", { planKey, mode: result.mode });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[safekey-checkout] api:uncaught", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Checkout route crashed.",
      },
      { status: 500 },
    );
  }
}
