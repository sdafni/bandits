import type { GeneratedTenantReport, TenantReviewInput } from "@/lib/ai/types";
import type { Recommendation } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { getRiskLevelFromScore, hasIdentityDocument } from "@/lib/risk-report";

export function generateHeuristicReport(input: TenantReviewInput): GeneratedTenantReport {
  const providedTypes = new Set(input.documents.map((document) => document.documentType));
  const missingDocuments = input.requestedDocuments.filter((document) => !providedTypes.has(document));
  const redFlags: string[] = [];
  const strengths: string[] = [];
  const reviewNotes: string[] = [];

  let score = 78;

  if (missingDocuments.length > 0) {
    score -= missingDocuments.length * 9;
    redFlags.push(`Missing ${missingDocuments.length} requested document(s): ${missingDocuments.join(", ")}.`);
  } else {
    strengths.push("Uploaded every requested document.");
  }

  if (!hasIdentityDocument(providedTypes)) {
    score -= 12;
    redFlags.push("No government-issued identity document was submitted.");
  } else {
    strengths.push("Identity document present in the submitted pack.");
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
  const watchTerms = ["arrears", "eviction", "late payment", "debt", "court", "default", "bankruptcy", "foreclosure"];

  const extractedSignals = watchTerms.filter((term) => extractedBlob.includes(term));

  if (extractedSignals.length > 0) {
    score -= extractedSignals.length * 6;
    redFlags.push(`Potential risk terms found in uploaded content: ${extractedSignals.join(", ")}.`);
  }

  if (input.tenantProfile?.employmentStatus) {
    strengths.push(`Employment status recorded as ${input.tenantProfile.employmentStatus.replaceAll("_", " ")}.`);
  } else {
    score -= 4;
    reviewNotes.push("Employment status was not provided.");
  }

  if (input.documents.length >= 3) {
    score += 4;
    strengths.push("Document pack is broad enough for an initial review.");
  } else if (input.documents.length === 1) {
    score -= 3;
    reviewNotes.push("Only one document uploaded in this batch.");
  }

  score = Math.min(98, Math.max(18, score));
  const identityConfidence = Math.max(30, Math.min(96, hasIdentityDocument(providedTypes) ? 84 : 42));
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
  const riskLevel = getRiskLevelFromScore(score);

  const summary = [
    `SafeKey Score: ${score}/100 (${riskLevel} risk).`,
    missingDocuments.length
      ? `${missingDocuments.length} requested item(s) are still missing.`
      : "The requested document pack is complete.",
    income && rent
      ? `Reported income is ${formatCurrency(income)} against rent of ${formatCurrency(rent)}.`
      : "Financial coverage could not be fully verified from the submitted profile.",
  ].join(" ");

  const explanation = [
    `${input.tenantFullName} received a SafeKey Score of ${score}/100 (${riskLevel} risk).`,
    redFlags.length > 0
      ? `Key concerns: ${redFlags.slice(0, 2).join(" ")}`
      : "No material red flags were identified in the submitted pack.",
    recommendation === "approve"
      ? "The file supports proceeding with standard tenancy steps."
      : recommendation === "conditional"
        ? "Proceed only after outstanding documents or affordability gaps are resolved."
        : "The current file presents material risk and should not proceed without escalation.",
  ].join(" ");

  return {
    score,
    recommendation,
    summary,
    explanation,
    redFlags,
    strengths,
    missingDocuments,
    riskLevel,
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
      riskLevel,
      explanation,
    },
    generatedBy: "heuristic-fallback",
  };
}
