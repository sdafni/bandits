import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import { logAiUsageCost } from "@/lib/ai/cost-logging";
import { generateHeuristicReport } from "@/lib/ai/heuristic";
import {
  buildTenantAnalysisUserPayload,
  OPENAI_TENANT_ANALYSIS_MODEL,
  TENANT_ANALYSIS_SYSTEM_PROMPT,
  TENANT_RISK_REPORT_JSON_SCHEMA,
} from "@/lib/ai/tenant-analysis-prompt";
import type { GeneratedTenantReport, TenantReviewInput } from "@/lib/ai/types";
import { env } from "@/lib/env";
import type { Recommendation } from "@/lib/database.types";
import { getRiskLevelFromScore, type RiskLevel } from "@/lib/risk-report";

const recommendationSchema = z.enum(["approve", "conditional", "decline"]);
const riskLevelSchema = z.enum(["low", "medium", "high"]);

const openAiReportSchema = z.object({
  score: z.number(),
  recommendation: recommendationSchema,
  riskLevel: riskLevelSchema,
  summary: z.string(),
  explanation: z.string(),
  redFlags: z.array(z.string()),
  strengths: z.array(z.string()),
  missingDocuments: z.array(z.string()),
  reasoning: z.object({
    identityConfidence: z.number().nullable().optional(),
    incomeStability: z.number().nullable().optional(),
    rentAffordability: z.number().nullable().optional(),
    employmentResidencyConfidence: z.number().nullable().optional(),
    documentCompleteness: z.number().nullable().optional(),
    debtToIncomeRatio: z.number().nullable().optional(),
    missingDocumentCount: z.number(),
    extractedSignals: z.array(z.string()),
    reviewNotes: z.array(z.string()),
    riskLevel: riskLevelSchema.optional(),
  }),
});

function normalizeReport(parsed: z.infer<typeof openAiReportSchema>, aiUsage: GeneratedTenantReport["reasoning"]["aiUsage"]): GeneratedTenantReport {
  const score = Math.min(100, Math.max(0, Math.round(parsed.score)));
  const riskLevel: RiskLevel = parsed.riskLevel ?? getRiskLevelFromScore(score);
  const recommendation = parsed.recommendation as Recommendation;

  return {
    score,
    recommendation,
    summary: parsed.summary.trim(),
    explanation: parsed.explanation.trim(),
    redFlags: parsed.redFlags,
    strengths: parsed.strengths,
    missingDocuments: parsed.missingDocuments,
    riskLevel,
    reasoning: {
      ...parsed.reasoning,
      riskLevel,
      explanation: parsed.explanation.trim(),
      extractedSignals: parsed.reasoning.extractedSignals ?? [],
      missingDocumentCount:
        parsed.reasoning.missingDocumentCount ?? parsed.missingDocuments.length,
      reviewNotes: parsed.reasoning.reviewNotes ?? [],
      aiUsage,
    },
    generatedBy: "openai",
  };
}

function extractUsage(response: OpenAI.Responses.Response) {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    responseId: response.id ?? null,
  };
}

export async function generateWithOpenAi(input: TenantReviewInput): Promise<GeneratedTenantReport> {
  const client = new OpenAI({ apiKey: env.openAiApiKey });

  const response = await client.responses.create({
    model: OPENAI_TENANT_ANALYSIS_MODEL,
    temperature: 0.2,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: TENANT_ANALYSIS_SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: buildTenantAnalysisUserPayload(input) }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "tenant_risk_report",
        schema: TENANT_RISK_REPORT_JSON_SCHEMA,
        strict: true,
      },
    },
  });

  const usage = extractUsage(response);
  const aiUsage = logAiUsageCost({
    checkId: input.checkId,
    model: OPENAI_TENANT_ANALYSIS_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    responseId: usage.responseId,
    generatedBy: "openai",
  });

  const rawText = response.output_text;
  if (!rawText) {
    throw new Error("OpenAI returned an empty analysis response.");
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error("OpenAI returned invalid JSON for tenant analysis.");
  }

  const parsed = openAiReportSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`OpenAI response failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }

  return normalizeReport(parsed.data, aiUsage);
}

export async function generateTenantRiskReportWithFallback(input: TenantReviewInput): Promise<GeneratedTenantReport> {
  if (!env.openAiApiKey) {
    return generateHeuristicReport(input);
  }

  try {
    return await generateWithOpenAi(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI request failed";
    console.warn("[safekey-ai:fallback]", JSON.stringify({ checkId: input.checkId, error: message }));

    const fallback = generateHeuristicReport(input);
    return {
      ...fallback,
      generatedBy: "heuristic-fallback",
      reasoning: {
        ...fallback.reasoning,
        reviewNotes: [...fallback.reasoning.reviewNotes, `OpenAI analysis unavailable: ${message}`],
      },
    };
  }
}
