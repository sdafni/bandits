import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildProfessionalReportData } from "./build-report-data";
import { generateProfessionalReportPdf } from "./pdf-generator";

async function main() {
  const sample = buildProfessionalReportData({
    checkId: "sample-check-id",
    tenantFullName: "Maria Papadopoulos",
    tenantEmail: "maria.papadopoulos@example.com",
    tenantPhone: "+30 690 000 0000",
    propertyName: "Kolonaki Residence",
    propertyMonthlyRent: 1200,
    status: "report_ready",
    aiReport: {
      id: "sample-report-id",
      tenant_check_id: "sample-check-id",
      score: 82,
      recommendation: "approve",
      summary: "SafeKey Score: 82/100 (low risk). The requested document pack is complete.",
      red_flags: [],
      strengths: ["Uploaded every requested document.", "Income appears comfortably above monthly rent."],
      missing_documents: [],
      reasoning: {
        missingDocumentCount: 0,
        extractedSignals: [],
        reviewNotes: [],
        riskLevel: "low",
        explanation:
          "Maria Papadopoulos received a SafeKey Score of 82/100 (low risk). No material red flags were identified. The file supports proceeding with standard tenancy steps.",
        debtToIncomeRatio: 0.28,
        documentCompleteness: 100,
        identityConfidence: 88,
        incomeStability: 86,
        rentAffordability: 90,
        employmentResidencyConfidence: 84,
      },
      generated_by: "sample",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pdf_storage_path: null,
      pdf_generated_at: null,
      pdf_version: null,
    },
    tenantProfile: {
      email: "maria.papadopoulos@example.com",
      phone: "+30 690 000 0000",
      employment_status: "full_time",
      employer_name: "Athens Tech Ltd",
      monthly_income: 4200,
    },
    uploadedDocumentTypes: ["passport", "payslips", "bank_statement"],
  });

  const pdf = await generateProfessionalReportPdf(sample);
  const outDir = join(process.cwd(), "qa-output");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "SafeKey_Report_Maria_Papadopoulos_sample.pdf");
  writeFileSync(outPath, pdf);
  console.log(`Sample PDF written to ${outPath}`);
}

main();
