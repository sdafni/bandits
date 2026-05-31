export function slugifyReportName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 48) || "Tenant";
}

export function buildProfessionalReportFileName(tenantName: string, reportDate: Date) {
  const datePart = reportDate.toISOString().slice(0, 10);
  return `SafeKey_Report_${slugifyReportName(tenantName)}_${datePart}.pdf`;
}

export function buildProfessionalReportStoragePath(checkId: string, fileName: string) {
  return `${checkId}/${fileName}`;
}
