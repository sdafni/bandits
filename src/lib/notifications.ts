import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { escapeHtml, renderSafeKeyEmail } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/resend";
import type { Recommendation } from "@/lib/database.types";
import { getRecommendationLabel, getRiskLevelFromScore, getRiskLevelLabel } from "@/lib/risk-report";

type TenantUploadInvitationInput = {
  propertyName: string;
  tenantEmail: string;
  tenantName: string;
  uploadUrl: string;
};

type WelcomeEmailInput = {
  recipientEmail: string;
  fullName?: string | null;
};

type LandlordCheckNotificationInput = {
  landlordId: string;
  checkId: string;
  tenantName: string;
  propertyName: string;
};

type LandlordReportReadyInput = LandlordCheckNotificationInput & {
  reportScore?: number | null;
  recommendation?: Recommendation | string | null;
  reportSummary?: string | null;
  pdfDownloadUrl?: string | null;
};

type TenantDocumentWorkflowInput = {
  documentLabels: string[];
  message?: string | null;
  propertyName: string;
  tenantEmail: string;
  tenantName: string;
  uploadUrl: string;
};

type TenantDocumentRejectedInput = {
  documentLabel: string;
  propertyName: string;
  reason: string;
  tenantEmail: string;
  tenantName: string;
  uploadUrl: string;
};

async function getLandlordRecipient(landlordId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("email, full_name").eq("id", landlordId).maybeSingle();
  if (!data?.email) {
    return null;
  }

  return {
    email: data.email,
    firstName: data.full_name?.trim()?.split(" ")[0] ?? "there",
  };
}

export async function notifyTenantUploadInvitation(input: TenantUploadInvitationInput) {
  const subject = `SafeKey secure upload invitation · ${input.propertyName}`;
  const text = [
    `Hello ${input.tenantName},`,
    "",
    "You received a secure SafeKey invitation to submit tenant screening documents.",
    "",
    `Property: ${input.propertyName}`,
    `Secure upload link: ${input.uploadUrl}`,
    "",
    "Expected review time: 24-48 hours after all requested documents are uploaded.",
    "",
    "This link is private. Do not share it with anyone else.",
    "",
    "SafeKey Trust Operations",
  ].join("\n");
  const html = renderSafeKeyEmail({
    title: "Secure tenant upload invitation",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(input.tenantName)}, your landlord invited you to submit requested screening documents securely.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Property:</strong> ${escapeHtml(input.propertyName)}</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Expected review time:</strong> 24-48 hours after all requested documents are uploaded.</p>
      <p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.5;">This link is private and time-limited. If anything looks unexpected, contact your landlord before sharing documents.</p>
    `,
    cta: { label: "Open secure upload page", href: input.uploadUrl },
  });

  return sendEmail({
    to: input.tenantEmail,
    subject,
    html,
    text,
  });
}

export async function notifyWelcomeEmail(input: WelcomeEmailInput) {
  const firstName = input.fullName?.trim()?.split(" ")[0] ?? "there";
  const subject = "Welcome to SafeKey";
  const dashboardUrl = `${env.appUrl}/dashboard`;
  const text = [
    `Hello ${firstName},`,
    "",
    "Welcome to SafeKey.",
    "Your account is ready. You can open your dashboard and start your first tenant check.",
    "",
    dashboardUrl,
    "",
    "SafeKey Trust Operations",
  ].join("\n");
  const html = renderSafeKeyEmail({
    title: "Welcome to SafeKey",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(firstName)}, your account is ready.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">SafeKey helps you run secure tenant checks and receive your SafeKey Report with a calm, clear workflow.</p>
    `,
    cta: { label: "Open dashboard", href: dashboardUrl },
  });

  return sendEmail({
    to: input.recipientEmail,
    subject,
    html,
    text,
  });
}

/** Landlord notification when a tenant submits documents. */
export async function notifyLandlordDocumentsReceived(input: LandlordCheckNotificationInput) {
  const landlord = await getLandlordRecipient(input.landlordId);
  if (!landlord) {
    console.info("[safekey-email:skipped]", { reason: "landlord_email_missing", checkId: input.checkId });
    return { delivered: false, reason: "email_not_configured" as const };
  }

  const checkUrl = `${env.appUrl}/dashboard/checks/${input.checkId}`;
  const subject = `Documents received · ${input.propertyName}`;
  const text = [
    `Hello ${landlord.firstName},`,
    "",
    `${input.tenantName} submitted documents for your tenant check.`,
    "",
    `Property: ${input.propertyName}`,
    "",
    `Review the case: ${checkUrl}`,
    "",
    "SafeKey Trust Operations",
  ].join("\n");
  const html = renderSafeKeyEmail({
    title: "Tenant documents received",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(landlord.firstName)}, <strong>${escapeHtml(input.tenantName)}</strong> submitted documents for your tenant check.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Property:</strong> ${escapeHtml(input.propertyName)}</p>
      <p style="margin:0;color:#334155;line-height:1.6;">Your SafeKey Report will be prepared after review.</p>
    `,
    cta: { label: "View tenant check", href: checkUrl },
  });

  return sendEmail({
    to: landlord.email,
    subject,
    html,
    text,
  });
}

/** Landlord notification when the SafeKey Report is ready. */
export async function notifyLandlordReportReady(input: LandlordReportReadyInput) {
  const landlord = await getLandlordRecipient(input.landlordId);
  if (!landlord) {
    console.info("[safekey-email:skipped]", { reason: "landlord_email_missing", checkId: input.checkId });
    return { delivered: false, reason: "email_not_configured" as const };
  }

  const reportUrl = `${env.appUrl}/dashboard/checks/${input.checkId}`;
  const pdfDownloadUrl = input.pdfDownloadUrl ?? `${env.appUrl}/api/reports/${input.checkId}/download`;
  const score =
    typeof input.reportScore === "number" ? input.reportScore : null;
  const recommendationKey =
    input.recommendation === "approve" ||
    input.recommendation === "conditional" ||
    input.recommendation === "decline"
      ? input.recommendation
      : null;
  const recommendationLabel = recommendationKey
    ? getRecommendationLabel(recommendationKey)
    : input.recommendation ?? null;
  const riskLevelLabel =
    score != null ? getRiskLevelLabel(getRiskLevelFromScore(score)) : null;
  const summaryLine = input.reportSummary?.trim() || null;

  const subject = "Your SafeKey Tenant Report Is Ready";
  const text = [
    `Hello ${landlord.firstName},`,
    "",
    `Your SafeKey Tenant Report is ready for ${input.tenantName}.`,
    "",
    `Property: ${input.propertyName}`,
    score != null ? `SafeKey Score: ${score}/100` : null,
    riskLevelLabel ? `Risk level: ${riskLevelLabel}` : null,
    recommendationLabel ? `Recommendation: ${recommendationLabel}` : null,
    summaryLine ? `Summary: ${summaryLine}` : null,
    "",
    `Download PDF: ${pdfDownloadUrl}`,
    `View online: ${reportUrl}`,
    "",
    "SafeKey Trust Operations",
  ]
    .filter(Boolean)
    .join("\n");
  const html = renderSafeKeyEmail({
    title: "Your SafeKey Tenant Report Is Ready",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(landlord.firstName)}, your SafeKey Tenant Report is ready for <strong>${escapeHtml(input.tenantName)}</strong>.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Property:</strong> ${escapeHtml(input.propertyName)}</p>
      ${
        score != null
          ? `<p style="margin:0 0 8px;color:#334155;line-height:1.6;"><strong>SafeKey Score:</strong> ${score}/100</p>`
          : ""
      }
      ${
        riskLevelLabel
          ? `<p style="margin:0 0 8px;color:#334155;line-height:1.6;"><strong>Risk level:</strong> ${escapeHtml(riskLevelLabel)}</p>`
          : ""
      }
      ${
        recommendationLabel
          ? `<p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Recommendation:</strong> ${escapeHtml(recommendationLabel)}</p>`
          : ""
      }
      ${
        summaryLine
          ? `<p style="margin:0 0 12px;color:#334155;line-height:1.6;">${escapeHtml(summaryLine)}</p>`
          : ""
      }
    `,
    cta: { label: "Download PDF report", href: pdfDownloadUrl },
  });

  return sendEmail({
    to: landlord.email,
    subject,
    html,
    text,
  });
}

export async function notifyTenantMissingDocumentsRequested(input: TenantDocumentWorkflowInput) {
  const subject = `SafeKey · Additional documents requested · ${input.propertyName}`;
  const labels = input.documentLabels.join(", ");
  const text = [
    `Hello ${input.tenantName},`,
    "",
    "Your landlord requested additional documents for your SafeKey application.",
    "",
    `Property: ${input.propertyName}`,
    `Requested: ${labels}`,
    input.message ? `Message: ${input.message}` : "",
    "",
    `Secure upload link: ${input.uploadUrl}`,
    "",
    "SafeKey Trust Operations",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderSafeKeyEmail({
    title: "Additional documents requested",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(input.tenantName)}, your landlord requested additional documents for your screening application.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Property:</strong> ${escapeHtml(input.propertyName)}</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Requested:</strong> ${escapeHtml(labels)}</p>
      ${input.message ? `<p style="margin:0 0 12px;color:#334155;line-height:1.6;">${escapeHtml(input.message)}</p>` : ""}
    `,
    cta: { label: "Open secure upload page", href: input.uploadUrl },
  });

  return sendEmail({ to: input.tenantEmail, subject, html, text });
}

export async function notifyTenantDocumentRejected(input: TenantDocumentRejectedInput) {
  const subject = `SafeKey · Document resubmission needed · ${input.propertyName}`;
  const text = [
    `Hello ${input.tenantName},`,
    "",
    "A document in your SafeKey application needs to be resubmitted.",
    "",
    `Property: ${input.propertyName}`,
    `Document: ${input.documentLabel}`,
    `Reason: ${input.reason}`,
    "",
    `Secure upload link: ${input.uploadUrl}`,
    "",
    "SafeKey Trust Operations",
  ].join("\n");

  const html = renderSafeKeyEmail({
    title: "Document resubmission needed",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hello ${escapeHtml(input.tenantName)}, one of your submitted documents needs to be uploaded again.</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Property:</strong> ${escapeHtml(input.propertyName)}</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Document:</strong> ${escapeHtml(input.documentLabel)}</p>
      <p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>
    `,
    cta: { label: "Resubmit document", href: input.uploadUrl },
  });

  return sendEmail({ to: input.tenantEmail, subject, html, text });
}
