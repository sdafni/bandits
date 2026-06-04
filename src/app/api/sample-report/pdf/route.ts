import { getSampleReportPdf } from "@/lib/sample-report-data";

export const runtime = "nodejs";

export async function GET() {
  const pdf = await getSampleReportPdf();

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="SafeKey_Sample_Report.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
