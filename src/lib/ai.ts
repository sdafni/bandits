import OpenAI from "openai";
import { env } from "@/lib/env";
import type { Recommendation, TenantRiskReasoning } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";

export type TenantReviewInput = {
  checkId: string;
  tenantFullName: string;
  requestedDocuments: string[];
  propertyMonthlyRent: number | null;
  tenantProfile: {
    employmentStatus: string | null;
    employerName: string | null;
    monthlyIncome: number | null;
    currentAddress: string | null;
    notes: string | null;
  } | null;
  documents: Array<{
    documentType: string;
    fileName: string;
    extractedText: string | null;
  }>;
};

export type GeneratedTenantReport = {
  score: number;
  recommendation: Recommendation;
  summary: string;
  redFlags: string[];
  strengths: string[];
  missingDocuments: string[];
  reasoning: TenantRiskReasoning;
  generatedBy: string;
};

export async function generateTenantRiskReport(input: TenantReviewInput): Promise<GeneratedTenantReport> {
  if (env.openAiApiKey) {
    try {
      return await generateWithOpenAi(input);
    } catch {
      return generateHeuristicReport(input);
    }
  }

  return generateHeuristicReport(input);
}

function generateHeuristicReport(input: TenantReviewInput): GeneratedTenantReport {
  const providedTypes = new Set(input.documents.map((document) => document.documentType));
  const missingDocuments = input.requestedDocuments.filter((document) => !providedTypes.has(document));
  const redFlags: string[] = [];
  const strengths: string[] = [];
  const reviewNotes: string[] = [];

  let score = 78;

  if (missingDocuments.length > 0) {
    score -= missingDocuments.length * 9;
    redFlags.push(`Missing ${missingDocuments.length} requested document(s).`);
  } else {
    strengths.push("Uploaded every requested document.");
  }

  const income = input.tenantProfile?.monthlyIncome ?? null;
  const rent = input.propertyMonthlyRent ?? null;
  const debtToIncomeRatio = income && rent ? rent / income : null;

  if (income && rent) {
    if (income >= rent * 3) {
      score += 8;
      strengths.push("Income appears comfortably above monthly rent.");
    } else if (income >= rent * 2.5) {
      score += 2;
      strengths.push("Income sits above a typical affordability threshold.");
    } else {
      score -= 14;
      redFlags.push("Income appears tight relative to monthly rent.");
    }
  } else {
    score -= 6;
    reviewNotes.push("Income-to-rent ratio could not be calculated.");
  }

  const extractedBlob = input.documents
    .map((document) => `${document.documentType}: ${document.extractedText ?? ""}`.toLowerCase())
    .join(" ");
  const watchTerms = ["arrears", "eviction", "late payment", "debt", "court", "default"];

  const extractedSignals = watchTerms.filter((term) => extractedBlob.includes(term));

  if (extractedSignals.length > 0) {
    score -= extractedSignals.length * 6;
    redFlags.push(`Potential risk terms found in uploaded content: ${extractedSignals.join(", ")}.`);
  }

  if (input.tenantProfile?.employmentStatus) {
    strengths.push(`Employment status recorded as ${input.tenantProfile.employmentStatus}.`);
  } else {
    score -= 4;
    reviewNotes.push("Employment status was not provided.");
  }

  if (input.documents.length >= 3) {
    score += 4;
    strengths.push("Document pack is broad enough for an initial review.");
  }

  score = Math.min(98, Math.max(18, score));
  const identityConfidence = Math.max(30, Math.min(96, providedTypes.has("government_id") ? 84 : 42));
  const incomeStability = Math.max(
    28,
    Math.min(
      96,
      income == null
        ? 46
        : income >= (rent ?? 0) * 3
          ? 88
          : income >= (rent ?? 0) * 2.5
            ? 74
            : 49,
    ),
  );
  const rentAffordability = Math.max(
    24,
    Math.min(
      96,
      debtToIncomeRatio == null
        ? 44
        : debtToIncomeRatio <= 0.33
          ? 90
          : debtToIncomeRatio <= 0.4
            ? 78
            : debtToIncomeRatio <= 0.5
              ? 61
              : 38,
    ),
  );
  const employmentResidencyConfidence = Math.max(
    30,
    Math.min(
      95,
      input.tenantProfile?.employmentStatus && input.tenantProfile?.currentAddress
        ? 80
        : input.tenantProfile?.employmentStatus || input.tenantProfile?.currentAddress
          ? 62
          : 41,
    ),
  );
  const documentCompleteness = Math.max(
    25,
    Math.min(
      100,
      input.requestedDocuments.length === 0
        ? 100
        : Math.round(((input.requestedDocuments.length - missingDocuments.length) / input.requestedDocuments.length) * 100),
    ),
  );

  const recommendation: Recommendation =
    score >= 76 ? "approve" : score >= 56 ? "conditional" : "decline";

  const summary = [
    `${input.tenantFullName}'s pack scores ${score}/100.`,
    missingDocuments.length
      ? `There are still ${missingDocuments.length} requested items missing.`
      : "The requested document pack is complete.",
    income && rent
      ? `Reported income is ${formatCurrency(income)} against rent of ${formatCurrency(rent)}.`
      : "Financial coverage could not be fully verified from the submitted profile.",
  ].join(" ");

  return {
    score,
    recommendation,
    summary,
    redFlags,
    strengths,
    missingDocuments,
    reasoning: {
      documentCompleteness,
      debtToIncomeRatio,
      employmentResidencyConfidence,
      missingDocumentCount: missingDocuments.length,
      extractedSignals,
      identityConfidence,
      incomeStability,
      rentAffordability,
      reviewNotes,
    },
    generatedBy: "heuristic-fallback",
  };
}

async function generateWithOpenAi(input: TenantReviewInput): Promise<GeneratedTenantReport> {
  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a tenant screening analyst for a Greek landlord platform. Return strict JSON with score, recommendation, summary, redFlags, strengths, missingDocuments, and reasoning { identityConfidence, incomeStability, rentAffordability, employmentResidencyConfidence, documentCompleteness, debtToIncomeRatio, missingDocumentCount, extractedSignals, reviewNotes }. Recommendation must be approve, conditional, or decline.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(input),
          },
        ],
      },
    ],
  });

  const rawText = response.output_text;
  const parsed = JSON.parse(rawText) as GeneratedTenantReport;

  return {
    ...parsed,
    generatedBy: "openai",
  };
}
