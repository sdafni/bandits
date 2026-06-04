import "server-only";

import type { Recommendation } from "@/lib/database.types";
import { buildProfessionalReportData } from "@/lib/reports/build-report-data";
import { SAFEKEY_REPORTS_BUCKET, PROFESSIONAL_REPORT_VERSION } from "@/lib/reports/constants";
import {
  buildProfessionalReportFileName,
  buildProfessionalReportStoragePath,
} from "@/lib/reports/filename";
import { generateProfessionalReportPdf } from "@/lib/reports/pdf-generator";
import type { StoredProfessionalReport } from "@/lib/reports/types";
import { getRiskLevelFromScore } from "@/lib/risk-report";
import { buildTrustWorkflowReport } from "@/lib/trust-workflows";
import { createAdminClient } from "@/lib/supabase/admin";

const CHECK_SELECT = `
  id,
  status,
  tenant_full_name,
  tenant_email,
  tenant_phone,
  requested_documents,
  review_completed_at,
  created_at,
  properties (name, monthly_rent),
  tenant_documents (document_type, created_at, file_name),
  tenant_public_profiles (email, phone, employment_status, employer_name, monthly_income, consent_confirmed, updated_at),
  ai_reports (*)
`;

function mapTrustRecommendationToDb(label: string): Recommendation {
  if (label === "Recommended") {
    return "approve";
  }

  if (label.startsWith("Recommended")) {
    return "conditional";
  }

  if (label.includes("High risk")) {
    return "decline";
  }

  return "conditional";
}

async function ensureReportsBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === SAFEKEY_REPORTS_BUCKET)) {
    await admin.storage.createBucket(SAFEKEY_REPORTS_BUCKET, { public: false });
  }
}

async function persistPdfBytes(
  admin: ReturnType<typeof createAdminClient>,
  checkId: string,
  tenantName: string,
  pdfBytes: Uint8Array,
): Promise<StoredProfessionalReport> {
  const generatedAt = new Date();
  const fileName = buildProfessionalReportFileName(tenantName, generatedAt);
  const storagePath = buildProfessionalReportStoragePath(checkId, fileName);

  const { error: uploadError } = await admin.storage.from(SAFEKEY_REPORTS_BUCKET).upload(storagePath, pdfBytes, {
    cacheControl: "3600",
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Could not store professional report PDF: ${uploadError.message}`);
  }

  const { error: updateError } = await admin
    .from("ai_reports")
    .update({
      pdf_storage_path: storagePath,
      pdf_generated_at: generatedAt.toISOString(),
      pdf_version: PROFESSIONAL_REPORT_VERSION,
    })
    .eq("tenant_check_id", checkId);

  if (updateError) {
    throw new Error(`Could not save PDF metadata: ${updateError.message}`);
  }

  return {
    storagePath,
    fileName,
    generatedAt: generatedAt.toISOString(),
  };
}

async function loadCheckRecord(checkId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("tenant_checks").select(CHECK_SELECT).eq("id", checkId).maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Tenant check not found for PDF generation.");
  }

  return { admin, record: data as Record<string, unknown> };
}

async function generateFromTrustSnapshot(checkId: string): Promise<StoredProfessionalReport | null> {
  const { admin, record } = await loadCheckRecord(checkId);
  const documents = Array.isArray(record.tenant_documents) ? record.tenant_documents : [];

  if (documents.length === 0) {
    return null;
  }

  const properties = Array.isArray(record.properties) ? record.properties[0] : record.properties;
  const tenantProfile = Array.isArray(record.tenant_public_profiles)
    ? record.tenant_public_profiles[0]
    : record.tenant_public_profiles;
  const uploadedDocumentTypes = documents.map((doc: { document_type: string }) => doc.document_type);
  const trustReport = buildTrustWorkflowReport({
    requestedDocuments: Array.isArray(record.requested_documents)
      ? (record.requested_documents as string[])
      : [],
    uploadedDocuments: uploadedDocumentTypes,
    caseCreatedAt: String(record.created_at),
    caseId: checkId,
    consent: tenantProfile
      ? {
          granted: Boolean(tenantProfile.consent_confirmed),
          recordedAt: tenantProfile.updated_at ?? null,
        }
      : null,
    documentHistory: documents.map((doc: { document_type: string; created_at: string; file_name?: string | null }) => ({
      documentType: doc.document_type,
      uploadedAt: doc.created_at,
      fileName: doc.file_name ?? null,
    })),
    reviewCompletedAt: (record.review_completed_at as string | null) ?? null,
    riskFlags: [],
    score: null,
    recommendation: null,
  });

  const score = Math.round(trustReport.confidenceScore);
  const recommendation = mapTrustRecommendationToDb(trustReport.recommendation);
  const riskLevel = getRiskLevelFromScore(score);
  const summary =
    trustReport.analystNotes?.trim() ||
    `SafeKey assigned a confidence score of ${score}/100 based on uploaded documents and profile completeness.`;

  const { data: upserted, error: upsertError } = await admin
    .from("ai_reports")
    .upsert(
      {
        tenant_check_id: checkId,
        score,
        recommendation,
        summary,
        reasoning: {
          riskLevel,
          explanation: summary,
          missingDocumentCount: trustReport.missingDocuments.length,
          extractedSignals: [],
          reviewNotes: [],
        },
        red_flags: trustReport.riskFlags,
        strengths: trustReport.identitySection.slice(0, 4),
        missing_documents: trustReport.missingDocuments,
        generated_by: "safekey_trust_snapshot",
      },
      { onConflict: "tenant_check_id" },
    )
    .select("*")
    .single();

  if (upsertError || !upserted) {
    throw new Error(upsertError?.message ?? "Could not persist trust snapshot report.");
  }

  const reportData = buildProfessionalReportData({
    checkId,
    tenantFullName: String(record.tenant_full_name),
    tenantEmail: (record.tenant_email as string | null) ?? null,
    tenantPhone: (record.tenant_phone as string | null) ?? null,
    propertyName: properties?.name ?? null,
    propertyMonthlyRent: properties?.monthly_rent ?? null,
    status: String(record.status),
    aiReport: upserted,
    tenantProfile: tenantProfile as never,
    uploadedDocumentTypes,
  });

  await ensureReportsBucket(admin);
  const pdfBytes = await generateProfessionalReportPdf(reportData);
  return persistPdfBytes(admin, checkId, reportData.tenantName, pdfBytes);
}

export async function ensureProfessionalReportPdf(checkId: string): Promise<StoredProfessionalReport | null> {
  const { admin, record } = await loadCheckRecord(checkId);
  const aiReport = Array.isArray(record.ai_reports) ? record.ai_reports[0] : record.ai_reports;

  if (aiReport?.pdf_storage_path) {
    return {
      storagePath: String(aiReport.pdf_storage_path),
      fileName: buildProfessionalReportFileName(String(record.tenant_full_name), new Date()),
      generatedAt: String(aiReport.pdf_generated_at ?? new Date().toISOString()),
    };
  }

  if (aiReport) {
    const { generateAndStoreProfessionalReport } = await import("@/lib/reports/generate-and-store");
    try {
      const stored = await generateAndStoreProfessionalReport(checkId);
      if (stored) {
        return stored;
      }
    } catch (error) {
      console.warn(
        "[safekey-report:pdf:ensure]",
        JSON.stringify({
          checkId,
          stage: "ai_report",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  try {
    return await generateFromTrustSnapshot(checkId);
  } catch (error) {
    console.error(
      "[safekey-report:pdf:ensure]",
      JSON.stringify({
        checkId,
        stage: "trust_snapshot",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}
