import type { TenantReviewInput } from "@/lib/ai/types";

export const OPENAI_TENANT_ANALYSIS_MODEL = "gpt-4.1-mini";

export const TENANT_ANALYSIS_SYSTEM_PROMPT = `You are SafeKey's tenant screening analyst for the Greek rental market.

Analyze the tenant profile and submitted document extracts. Produce a structured risk assessment for landlords.

Rules:
- score: integer 0-100 (SafeKey Score). Higher is lower risk.
- riskLevel: "low" (score 80+), "medium" (60-79), "high" (below 60). Must align with score.
- recommendation: "approve" | "conditional" | "decline"
  - approve = Approve tenancy
  - conditional = Approve With Conditions (missing docs, affordability gaps, or inconsistencies)
  - decline = Reject tenancy (material risk)
- redFlags: concrete adverse findings (empty array if none)
- missingDocuments: requested document types not present in uploads (use exact type keys from input)
- strengths: positive signals supporting approval
- explanation: 2-4 sentence plain-language summary for the landlord explaining the decision
- summary: one-line headline including SafeKey Score and risk level
- reasoning: underwriting metrics (0-100 where applicable), debtToIncomeRatio (rent/income decimal or null), extractedSignals (adverse keywords found), reviewNotes (analyst caveats)

Be conservative. Flag affordability below 2.5x rent coverage, missing identity docs, and adverse terms in extracted text.
Return JSON only. No markdown.`;

export function buildTenantAnalysisUserPayload(input: TenantReviewInput) {
  return JSON.stringify(
    {
      checkId: input.checkId,
      tenantFullName: input.tenantFullName,
      propertyMonthlyRent: input.propertyMonthlyRent,
      requestedDocuments: input.requestedDocuments,
      tenantProfile: input.tenantProfile,
      documents: input.documents.map((document) => ({
        documentType: document.documentType,
        fileName: document.fileName,
        extractedTextPreview: document.extractedText?.slice(0, 3000) ?? null,
      })),
    },
    null,
    2,
  );
}

export const TENANT_RISK_REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "recommendation",
    "riskLevel",
    "summary",
    "explanation",
    "redFlags",
    "strengths",
    "missingDocuments",
    "reasoning",
  ],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    recommendation: { type: "string", enum: ["approve", "conditional", "decline"] },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string" },
    explanation: { type: "string" },
    redFlags: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    missingDocuments: { type: "array", items: { type: "string" } },
    reasoning: {
      type: "object",
      additionalProperties: false,
      required: ["missingDocumentCount", "extractedSignals", "reviewNotes"],
      properties: {
        identityConfidence: { type: ["number", "null"] },
        incomeStability: { type: ["number", "null"] },
        rentAffordability: { type: ["number", "null"] },
        employmentResidencyConfidence: { type: ["number", "null"] },
        documentCompleteness: { type: ["number", "null"] },
        debtToIncomeRatio: { type: ["number", "null"] },
        missingDocumentCount: { type: "integer" },
        extractedSignals: { type: "array", items: { type: "string" } },
        reviewNotes: { type: "array", items: { type: "string" } },
        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
      },
    },
  },
} as const;
