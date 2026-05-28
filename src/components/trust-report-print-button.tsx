"use client";

export function TrustReportPrintButton() {
  return (
    <button className="workspace-cta" onClick={() => window.print()} type="button">
      Download PDF
    </button>
  );
}
