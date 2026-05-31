import "server-only";

import { buildProfessionalReportData } from "@/lib/reports/build-report-data";
import { SAFEKEY_REPORTS_BUCKET, PROFESSIONAL_REPORT_VERSION } from "@/lib/reports/constants";
import {
  buildProfessionalReportFileName,
  buildProfessionalReportStoragePath,
} from "@/lib/reports/filename";
import { generateProfessionalReportPdf } from "@/lib/reports/pdf-generator";
import type { StoredProfessionalReport } from "@/lib/reports/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateAndStoreProfessionalReport(
  checkId: string,
): Promise<StoredProfessionalReport | null> {
  const admin = createAdminClient();

  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === SAFEKEY_REPORTS_BUCKET)) {
    await admin.storage.createBucket(SAFEKEY_REPORTS_BUCKET, { public: false });
  }

  const { data, error } = await admin
    .from("tenant_checks")
    .select(
      `
        id,
        status,
        tenant_full_name,
        tenant_email,
        tenant_phone,
        properties (name, monthly_rent),
        tenant_documents (document_type),
        tenant_public_profiles (email, phone, employment_status, employer_name, monthly_income),
        ai_reports (*)
      `,
    )
    .eq("id", checkId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Tenant check not found for PDF generation.");
  }

  const record = data as Record<string, unknown>;
  const aiReport = Array.isArray(record.ai_reports)
    ? record.ai_reports[0]
    : record.ai_reports;

  if (!aiReport) {
    return null;
  }

  const properties = Array.isArray(record.properties)
    ? record.properties[0]
    : record.properties;
  const tenantProfile = Array.isArray(record.tenant_public_profiles)
    ? record.tenant_public_profiles[0]
    : record.tenant_public_profiles;
  const documents = Array.isArray(record.tenant_documents) ? record.tenant_documents : [];

  const reportData = buildProfessionalReportData({
    checkId: String(record.id),
    tenantFullName: String(record.tenant_full_name),
    tenantEmail: (record.tenant_email as string | null) ?? null,
    tenantPhone: (record.tenant_phone as string | null) ?? null,
    propertyName: properties?.name ?? null,
    propertyMonthlyRent: properties?.monthly_rent ?? null,
    status: String(record.status),
    aiReport: aiReport as never,
    tenantProfile: tenantProfile as never,
    uploadedDocumentTypes: documents.map((doc: { document_type: string }) => doc.document_type),
  });

  const generatedAt = new Date();
  const fileName = buildProfessionalReportFileName(reportData.tenantName, generatedAt);
  const storagePath = buildProfessionalReportStoragePath(checkId, fileName);
  const pdfBytes = await generateProfessionalReportPdf(reportData);

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

  console.info(
    "[safekey-report:pdf]",
    JSON.stringify({ checkId, storagePath, fileName, bytes: pdfBytes.length }),
  );

  return {
    storagePath,
    fileName,
    generatedAt: generatedAt.toISOString(),
  };
}

export async function createProfessionalReportDownloadUrl(storagePath: string, expiresInSeconds = 3600) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(SAFEKEY_REPORTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create download URL.");
  }

  return data.signedUrl;
}
