import { NextResponse } from "next/server";
import { requireLandlord } from "@/lib/auth";
import { createProfessionalReportDownloadUrl } from "@/lib/reports/generate-and-store";
import { ensureProfessionalReportPdf } from "@/lib/reports/ensure-professional-report";
import { buildProfessionalReportFileName } from "@/lib/reports/filename";
import { getLandlordCheckDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ checkId: string }> },
) {
  const { checkId } = await context.params;
  const { profile } = await requireLandlord();
  const detail = await getLandlordCheckDetail(checkId);

  if (!detail || detail.landlord_id !== profile.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let pdfPath = detail.ai_reports?.pdf_storage_path;
  if (!pdfPath) {
    const stored = await ensureProfessionalReportPdf(checkId);
    if (!stored) {
      return NextResponse.json({ error: "pdf_not_ready" }, { status: 404 });
    }
    pdfPath = stored.storagePath;
  }

  const signedUrl = await createProfessionalReportDownloadUrl(pdfPath);
  const fileName = buildProfessionalReportFileName(
    detail.tenant_full_name,
    new Date(detail.ai_reports?.pdf_generated_at ?? detail.ai_reports?.created_at ?? Date.now()),
  );

  return NextResponse.redirect(signedUrl, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
