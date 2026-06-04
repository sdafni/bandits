import { buildProfessionalReportData } from "@/lib/reports/build-report-data";
import { generateProfessionalReportPdf } from "@/lib/reports/pdf-generator";
import { buildTrustWorkflowReport } from "@/lib/trust-workflows";

export const SAMPLE_REPORT_CASE_ID = "sample-report";

export const sampleReportMeta = {
  tenantName: "Maria Papadopoulou",
  tenantEmail: "maria.approved.demo@safekey.gr",
  propertyName: "Kolonaki Executive Apartment",
  propertyAddress: "24 Tsakalof Street, Athens 10673",
  monthlyRent: 1350,
  monthlyIncome: 4800,
  employer: "Hellenic Shipping Group",
  score: 91,
  recommendation: "approve" as const,
  summary:
    "Low-risk applicant with strong affordability, complete documents, and a clean verification file ready for protection packaging.",
  riskSummary:
    "All requested documents were submitted. Income comfortably covers rent with a low debt-to-income profile. No material red flags identified.",
  uploadedDocuments: [
    "national_id",
    "payslips",
    "bank_statement",
    "employment_contract",
    "landlord_reference",
    "utility_bill",
  ],
  requestedDocuments: [
    "national_id",
    "payslips",
    "bank_statement",
    "employment_contract",
    "landlord_reference",
    "utility_bill",
  ],
  strengths: [
    "All requested documents were submitted.",
    "Income appears comfortably above monthly rent.",
    "Reference status is supportive.",
  ],
  generatedAt: "2026-05-15T10:30:00.000Z",
};

export function getSampleTrustReport() {
  return buildTrustWorkflowReport({
    caseId: SAMPLE_REPORT_CASE_ID,
    caseCreatedAt: sampleReportMeta.generatedAt,
    recommendation: sampleReportMeta.recommendation,
    score: sampleReportMeta.score,
    requestedDocuments: sampleReportMeta.requestedDocuments,
    uploadedDocuments: sampleReportMeta.uploadedDocuments,
    analystNotes:
      "Sample SafeKey deliverable for landlords and partners. This file illustrates the trust score, recommendation, and document completeness view you receive after screening.",
    riskFlags: [],
    consent: { granted: true, recordedAt: sampleReportMeta.generatedAt },
    documentHistory: sampleReportMeta.uploadedDocuments.map((documentType, index) => ({
      documentType,
      uploadedAt: new Date(Date.parse(sampleReportMeta.generatedAt) - index * 86400000).toISOString(),
      fileName: `${documentType}.pdf`,
    })),
    reviewCompletedAt: sampleReportMeta.generatedAt,
  });
}

let cachedSamplePdf: Uint8Array | undefined;

export async function getSampleReportPdf(): Promise<Uint8Array> {
  if (cachedSamplePdf) {
    return cachedSamplePdf;
  }

  const reportData = buildProfessionalReportData({
    checkId: SAMPLE_REPORT_CASE_ID,
    tenantFullName: sampleReportMeta.tenantName,
    tenantEmail: sampleReportMeta.tenantEmail,
    tenantPhone: "+30 698 100 1001",
    propertyName: sampleReportMeta.propertyName,
    propertyMonthlyRent: sampleReportMeta.monthlyRent,
    status: "report_ready",
    aiReport: {
      id: "sample-report-ai",
      tenant_check_id: SAMPLE_REPORT_CASE_ID,
      score: sampleReportMeta.score,
      recommendation: sampleReportMeta.recommendation,
      summary: sampleReportMeta.summary,
      red_flags: [],
      strengths: sampleReportMeta.strengths,
      missing_documents: [],
      reasoning: {
        missingDocumentCount: 0,
        extractedSignals: [],
        reviewNotes: ["Stable salaried employment.", "Clean document set.", "Strong residency evidence."],
        riskLevel: "low",
        explanation: sampleReportMeta.riskSummary,
        debtToIncomeRatio: 0.28,
        documentCompleteness: 100,
        identityConfidence: 94,
        incomeStability: 89,
        rentAffordability: 92,
        employmentResidencyConfidence: 91,
      },
      generated_by: "sample",
      created_at: sampleReportMeta.generatedAt,
      updated_at: sampleReportMeta.generatedAt,
      pdf_storage_path: null,
      pdf_generated_at: null,
      pdf_version: null,
    },
    tenantProfile: {
      email: sampleReportMeta.tenantEmail,
      phone: "+30 698 100 1001",
      employment_status: "full_time",
      employer_name: sampleReportMeta.employer,
      monthly_income: sampleReportMeta.monthlyIncome,
    },
    uploadedDocumentTypes: sampleReportMeta.uploadedDocuments,
  });

  cachedSamplePdf = await generateProfessionalReportPdf(reportData);
  return cachedSamplePdf;
}
