import "server-only";

import type { AiUsageCostRecord } from "@/lib/ai/types";

/** Per-1M-token pricing for billing analytics (update when OpenAI pricing changes). */
const MODEL_PRICING_USD: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "gpt-4.1": { inputPer1M: 2.0, outputPer1M: 8.0 },
};

type UsageInput = {
  checkId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  responseId?: string | null;
};

export function estimateOpenAiCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const pricing = MODEL_PRICING_USD[model] ?? MODEL_PRICING_USD["gpt-4.1-mini"];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

  return Number((inputCost + outputCost).toFixed(6));
}

export function buildAiUsageRecord(input: UsageInput): AiUsageCostRecord {
  const totalTokens = input.inputTokens + input.outputTokens;

  return {
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens,
    estimatedCostUsd: estimateOpenAiCostUsd(input.model, input.inputTokens, input.outputTokens),
    responseId: input.responseId ?? null,
    generatedAt: new Date().toISOString(),
  };
}

/** Structured log for future billing analytics pipelines (Datadog, Supabase ingest, etc.). */
export function logAiUsageCost(input: UsageInput & { generatedBy: string; fallback?: boolean }) {
  const record = buildAiUsageRecord(input);

  console.info(
    "[safekey-ai:usage]",
    JSON.stringify({
      checkId: input.checkId,
      generatedBy: input.generatedBy,
      fallback: input.fallback ?? false,
      ...record,
    }),
  );

  return record;
}
