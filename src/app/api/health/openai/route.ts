import { NextResponse } from "next/server";
import { generateTenantRiskReportWithFallback } from "@/lib/ai/openai";
import { hasOpenAiEnv, hasSupabaseServiceEnv, env } from "@/lib/env";

export const dynamic = "force-dynamic";

function authorizeServiceRequest(request: Request) {
  if (!hasSupabaseServiceEnv()) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${env.supabaseServiceRoleKey}`;
}

/** GET — OpenAI readiness (no secrets). */
export async function GET() {
  return NextResponse.json({
    openAiReady: hasOpenAiEnv(),
    model: hasOpenAiEnv() ? "gpt-4.1-mini" : null,
    fallbackEngine: "heuristic-fallback",
  });
}

/** POST — smoke-test tenant analysis (service-role auth only). */
export async function POST(request: Request) {
  if (!authorizeServiceRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = await generateTenantRiskReportWithFallback({
    checkId: "openai-smoke-test",
    tenantFullName: "Smoke Test Tenant",
    requestedDocuments: ["passport", "payslips"],
    propertyMonthlyRent: 900,
    tenantProfile: {
      currentAddress: "Athens, Greece",
      employerName: "Acme Ltd",
      employmentStatus: "full_time",
      monthlyIncome: 2800,
      notes: null,
    },
    documents: [
      {
        documentType: "passport",
        fileName: "passport.pdf",
        extractedText: "Passport identity document for Smoke Test Tenant.",
      },
    ],
  });

  return NextResponse.json({
    ok: true,
    generatedBy: report.generatedBy,
    score: report.score,
    riskLevel: report.riskLevel,
    recommendation: report.recommendation,
    redFlagCount: report.redFlags.length,
    missingDocumentCount: report.missingDocuments.length,
    hasExplanation: Boolean(report.explanation),
    aiUsage: report.reasoning.aiUsage ?? null,
  });
}
