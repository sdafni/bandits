import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTenantRiskReport, type GeneratedTenantReport, type TenantReviewInput } from "@/lib/ai";
import type { Database } from "@/lib/database.types";
import { getRiskLevelFromScore } from "@/lib/risk-report";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndStoreProfessionalReport } from "@/lib/reports/generate-and-store";

export type TenantCheckReportSource = {
  id: string;
  landlord_id: string;
  tenant_full_name: string;
  requested_documents: string[];
  review_requested_at: string | null;
  properties: { monthly_rent: number | null; name: string } | null;
  tenant_documents: Array<{
    document_type: string;
    extracted_text: string | null;
    file_name: string;
  }>;
  tenant_public_profiles: {
    current_address: string | null;
    employer_name: string | null;
    employment_status: string | null;
    id: string;
    monthly_income: number | null;
    notes: string | null;
  } | null;
};

export function buildTenantReviewInput(check: TenantCheckReportSource): TenantReviewInput {
  return {
    checkId: check.id,
    documents: check.tenant_documents.map((document) => ({
      documentType: document.document_type,
      extractedText: document.extracted_text,
      fileName: document.file_name,
    })),
    propertyMonthlyRent: check.properties?.monthly_rent ?? null,
    requestedDocuments: check.requested_documents,
    tenantFullName: check.tenant_full_name,
    tenantProfile: check.tenant_public_profiles
      ? {
          currentAddress: check.tenant_public_profiles.current_address,
          employerName: check.tenant_public_profiles.employer_name,
          employmentStatus: check.tenant_public_profiles.employment_status,
          monthlyIncome: check.tenant_public_profiles.monthly_income,
          notes: check.tenant_public_profiles.notes,
        }
      : null,
  };
}

function withRiskLevel(report: GeneratedTenantReport): GeneratedTenantReport {
  return {
    ...report,
    reasoning: {
      ...report.reasoning,
      riskLevel: report.reasoning.riskLevel ?? getRiskLevelFromScore(report.score),
    },
  };
}

export async function generateAndPersistTenantRiskReport(
  client: SupabaseClient<Database>,
  check: TenantCheckReportSource,
): Promise<GeneratedTenantReport> {
  const generated = withRiskLevel(await generateTenantRiskReport(buildTenantReviewInput(check)));

  const { error: reportError } = await client.from("ai_reports").upsert(
    {
      generated_by: generated.generatedBy,
      missing_documents: generated.missingDocuments,
      recommendation: generated.recommendation,
      reasoning: generated.reasoning,
      red_flags: generated.redFlags,
      score: generated.score,
      strengths: generated.strengths,
      summary: generated.summary,
      tenant_check_id: check.id,
    },
    { onConflict: "tenant_check_id" },
  );

  if (reportError) {
    throw new Error(reportError.message);
  }

  const { error: completeError } = await client
    .from("tenant_checks")
    .update({
      review_completed_at: new Date().toISOString(),
      review_requested_at: check.review_requested_at ?? new Date().toISOString(),
      status: "report_ready",
    })
    .eq("id", check.id);

  if (completeError) {
    throw new Error(completeError.message);
  }

  try {
    await generateAndStoreProfessionalReport(check.id);
  } catch (error) {
    console.warn(
      "[safekey-report:pdf:fallback]",
      JSON.stringify({
        checkId: check.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return generated;
}

export async function markCheckUnderReview(client: SupabaseClient<Database>, checkId: string, reviewRequestedAt: string | null) {
  const { error } = await client
    .from("tenant_checks")
    .update({
      review_requested_at: reviewRequestedAt ?? new Date().toISOString(),
      status: "under_review",
    })
    .eq("id", checkId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadTenantCheckReportSource(checkId: string): Promise<TenantCheckReportSource | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_checks")
    .select(
      `
        id,
        landlord_id,
        tenant_full_name,
        requested_documents,
        review_requested_at,
        properties (monthly_rent, name),
        tenant_documents (document_type, extracted_text, file_name),
        tenant_public_profiles (id, current_address, employer_name, employment_status, monthly_income, notes)
      `,
    )
    .eq("id", checkId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const record = data as Record<string, unknown>;

  return {
    id: String(record.id),
    landlord_id: String(record.landlord_id),
    tenant_full_name: String(record.tenant_full_name),
    requested_documents: Array.isArray(record.requested_documents)
      ? (record.requested_documents as string[])
      : [],
    review_requested_at: (record.review_requested_at as string | null) ?? null,
    properties: Array.isArray(record.properties)
      ? ((record.properties[0] as TenantCheckReportSource["properties"]) ?? null)
      : ((record.properties as TenantCheckReportSource["properties"]) ?? null),
    tenant_documents: Array.isArray(record.tenant_documents)
      ? (record.tenant_documents as TenantCheckReportSource["tenant_documents"])
      : [],
    tenant_public_profiles: Array.isArray(record.tenant_public_profiles)
      ? ((record.tenant_public_profiles[0] as TenantCheckReportSource["tenant_public_profiles"]) ?? null)
      : ((record.tenant_public_profiles as TenantCheckReportSource["tenant_public_profiles"]) ?? null),
  };
}
