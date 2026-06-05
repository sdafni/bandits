import { CREDIT_REPORT_DOCUMENT_TYPE } from "@/lib/safekey-document-catalog";
import {
  getLatestDocumentsByType,
  normalizeDocumentReviewStatus,
  type TenantDocumentReviewRow,
} from "@/lib/document-review";

export const TIRESIAS_PUBLIC_SERVICE_URL =
  "https://www.tiresias.gr/en/individuals/public-service-office/";

export type CreditReportWorkflowStatus = "not_provided" | "requested" | "uploaded" | "verified";

export type CreditReportFinancialReliability = {
  creditReport: "uploaded" | "not_uploaded";
  creditScore: "available" | "not_available";
};

export function resolveCreditReportWorkflowStatus(params: {
  creditReportRequestedAt?: string | null;
  tenantDocuments: TenantDocumentReviewRow[];
}): CreditReportWorkflowStatus {
  const latest = getLatestDocumentsByType(params.tenantDocuments).get(CREDIT_REPORT_DOCUMENT_TYPE);

  if (!latest) {
    return params.creditReportRequestedAt ? "requested" : "not_provided";
  }

  const reviewStatus = normalizeDocumentReviewStatus(latest.upload_status);
  if (reviewStatus === "accepted") {
    return "verified";
  }

  return "uploaded";
}

export function resolveCreditReportFinancialReliability(
  uploadedDocumentTypes: string[],
): CreditReportFinancialReliability {
  const hasCreditReport = uploadedDocumentTypes.some(
    (documentType) => documentType === CREDIT_REPORT_DOCUMENT_TYPE,
  );

  return {
    creditReport: hasCreditReport ? "uploaded" : "not_uploaded",
    creditScore: hasCreditReport ? "available" : "not_available",
  };
}

export function buildCreditReportTrustEmailSection() {
  const tiresiasUrl = TIRESIAS_PUBLIC_SERVICE_URL;

  return {
    html: `
      <div style="margin:24px 0 0;padding:20px;border:1px solid #dbe2eb;border-radius:14px;background:#f8fafc;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0f2343;">Strengthen your SafeKey Trust Score</p>
        <p style="margin:0 0 12px;color:#334155;line-height:1.6;">A Credit Report may improve your SafeKey assessment and help landlords make faster decisions.</p>
        <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Credit Reports in Greece can be requested <strong>free of charge</strong> from Tiresias, the official Greek Credit Bureau.</p>
        <p style="margin:0 0 12px;color:#475569;font-size:13px;line-height:1.5;">This document is optional but may strengthen your SafeKey Trust Score.</p>
        <ol style="margin:0 0 16px;padding-left:20px;color:#334155;line-height:1.6;">
          <li style="margin-bottom:6px;">Request your free Credit Report from the <strong>Tiresias Public Service</strong> page.</li>
          <li style="margin-bottom:6px;">Request <strong>Credit Report</strong>, <strong>Credit Score</strong>, or <strong>both</strong> — free for individuals.</li>
          <li style="margin-bottom:6px;">Receive the report by email from Tiresias.</li>
          <li>Upload the official PDF to your SafeKey upload page.</li>
        </ol>
        <a href="${tiresiasUrl}" style="display:inline-block;background:#0f2343;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;">Get My Free Credit Report</a>
        <p style="margin:14px 0 0;font-size:12px;color:#64748b;line-height:1.5;">SafeKey never asks for bank passwords, usernames, online banking credentials, or account access. Only upload the official PDF you receive directly from Tiresias.</p>
      </div>
    `,
    text: [
      "",
      "Strengthen your SafeKey Trust Score",
      "A Credit Report may improve your SafeKey assessment and help landlords make faster decisions.",
      "",
      "Credit Reports in Greece can be requested free of charge from Tiresias, the official Greek Credit Bureau.",
      "This document is optional but may strengthen your SafeKey Trust Score.",
      "",
      "How to get your free report:",
      "1. Open the Tiresias Public Service page.",
      "2. Request Credit Report, Credit Score, or both (free for individuals).",
      "3. Receive the report by email from Tiresias.",
      "4. Upload the official PDF to SafeKey.",
      "",
      `Get My Free Credit Report: ${tiresiasUrl}`,
      "",
      "SafeKey never asks for bank passwords, usernames, online banking credentials, or account access.",
    ].join("\n"),
  };
}
