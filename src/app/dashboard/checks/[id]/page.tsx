import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { AiScreeningReport } from "@/components/ai-screening-report";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/badge";
import { RecoveryNavigationActions } from "@/components/recovery-navigation-actions";
import { ScreeningCheckoutForm } from "@/components/screening-checkout-form";
import { getBillingEligibilityForCheck } from "@/lib/billing-queries";
import { CaseOriginBadge } from "@/components/case-origin-badge";
import { getCaseOriginBadgeLabel, isDemoCheckId } from "@/lib/demo-data";
import { requireLandlord } from "@/lib/auth";
import { getRequestLocale } from "@/lib/i18n-server";
import type { Database } from "@/lib/database.types";
import {
  buildProtectionAssessment,
  formatDepositQuoteSummary,
  formatEligibilityStatus,
  getEligibilityTone,
} from "@/lib/protection";
import { buildTrustWorkflowReport, getDocumentLabel, getWorkflowStatusLabel } from "@/lib/trust-workflows";
import { getLandlordCheckDetail, getProtectionSnapshot } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Case Detail",
  description: "Review a SafeKey tenant screening case and final report.",
};

export default async function LandlordCheckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const locale = await getRequestLocale();
  const isGreek = locale === "el";
  const { profile } = await requireLandlord();
  const { id } = await params;
  const query = await searchParams;
  const detail = await getLandlordCheckDetail(id);

  if (!detail) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <section className="card space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Case access</p>
            <h1 className="text-3xl font-semibold text-slate-950">Your session has expired</h1>
            <p className="text-sm leading-7 text-slate-600">
              For security reasons, your SafeKey session expired after inactivity. Your data is safe. Please continue below.
            </p>
            <RecoveryNavigationActions showResume />
          </section>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const protectionSnapshot = await getProtectionSnapshot(id);
  const isDemoCase = isDemoCheckId(id);
  const billingEligibility = isDemoCase
    ? { activeSubscription: null, customer: null, hasBillingAccess: true, screeningPayment: null }
    : await getBillingEligibilityForCheck({
        checkId: id,
        landlordId: profile.id,
        useAdmin: true,
      });

  const documents = isDemoCase
    ? detail.tenant_documents.map((document: Database["public"]["Tables"]["tenant_documents"]["Row"]) => ({
        ...document,
        signedUrl: null,
      }))
    : await Promise.all(
        detail.tenant_documents.map(
          async (document: Database["public"]["Tables"]["tenant_documents"]["Row"]) => {
            const { data } = await supabase.storage
              .from("tenant-documents")
              .createSignedUrl(document.storage_path, 60 * 60);

            return {
              ...document,
              signedUrl: data?.signedUrl ?? null,
            };
          },
        ),
      );

  const fallbackProtection = buildProtectionAssessment({
    aiReport: detail.ai_reports,
    documents: detail.tenant_documents.map((document) => ({ document_type: document.document_type })),
    propertyMonthlyRent: detail.properties?.monthly_rent ?? null,
    requestedDocuments: detail.requested_documents,
    tenantProfile: detail.tenant_public_profiles,
  });

  const protectionAssessment = detail.ai_reports
    ? {
        depositQuote: protectionSnapshot?.depositQuote
          ? {
              coverageAmount: protectionSnapshot.depositQuote.coverage_amount,
              proposedProtectionFee: protectionSnapshot.depositQuote.proposed_protection_fee,
              rentAmount: protectionSnapshot.depositQuote.rent_amount,
              status: protectionSnapshot.depositQuote.status,
              summary: formatDepositQuoteSummary(protectionSnapshot.depositQuote.status),
              traditionalDepositAmount: protectionSnapshot.depositQuote.traditional_deposit_amount,
            }
          : fallbackProtection?.depositQuote ?? null,
        eligibilityReason:
          protectionSnapshot?.insuranceEligibility?.eligibility_reason ??
          fallbackProtection?.eligibilityReason ??
          "Protection eligibility will appear after the risk report is generated.",
        missingRequirements:
          protectionSnapshot?.insuranceEligibility?.missing_requirements ??
          fallbackProtection?.missingRequirements ??
          [],
        nextAction:
          fallbackProtection?.nextAction ??
          "Request a manual partner review to continue the protection workflow.",
        packageOptions:
          protectionSnapshot && protectionSnapshot.protectionOptions.length > 0
            ? protectionSnapshot.protectionOptions.map((item) => ({
                coverageItems: item.protection_packages?.coverage_items ?? [],
                description: item.protection_packages?.description ?? "",
                eligibilityStatus: item.eligibility_status,
                estimatedPrice: item.protection_packages?.estimated_price ?? "Indicative",
                label:
                  item.protection_packages?.name ===
                  protectionSnapshot.insuranceEligibility?.recommended_package
                    ? ("recommended" as const)
                    : ("optional" as const),
                name: item.protection_packages?.name ?? "Protection option",
                recommendationReason: item.recommendation_reason,
                type: item.protection_packages?.type ?? "screening-linked-protection",
              }))
            : fallbackProtection?.packageOptions ?? [],
        recommendedPackage:
          protectionSnapshot?.insuranceEligibility?.recommended_package ??
          fallbackProtection?.recommendedPackage ??
          null,
        riskScore:
          protectionSnapshot?.insuranceEligibility?.risk_score ??
          fallbackProtection?.riskScore ??
          detail.ai_reports.score,
        status:
          protectionSnapshot?.insuranceEligibility?.status ??
          fallbackProtection?.status ??
          "pending_more_documents",
      }
    : null;
  const trustReport = buildTrustWorkflowReport({
    analystNotes:
      typeof detail.ai_reports?.reasoning === "string"
        ? detail.ai_reports.reasoning
        : detail.ai_reports?.reasoning
          ? JSON.stringify(detail.ai_reports.reasoning)
          : null,
    recommendation: detail.ai_reports?.recommendation ?? null,
    requestedDocuments: detail.requested_documents,
    riskFlags: detail.ai_reports?.red_flags ?? [],
    score: detail.ai_reports?.score ?? null,
    uploadedDocuments: detail.tenant_documents.map((item) => item.document_type),
  });
  const workflowStatus = getWorkflowStatusLabel({
    status: detail.status,
    uploadTokenExpiresAt: detail.upload_token_expires_at,
  });

  return (
    <main className="min-h-screen">
      <AppHeader
        locale={locale}
        actions={
          <Link
            className="secondary-action min-h-12 rounded-[18px] px-5 py-3"
            href="/dashboard"
          >
            {isGreek ? "Επιστροφή στον πίνακα" : "Back to dashboard"}
          </Link>
        }
        homeHref="/dashboard"
        subtitle={`${detail.properties?.name ?? "Property"} • Tenant Passport Greece case created ${formatDate(detail.created_at)}`}
        title={isGreek ? `Υπόθεση SafeKey: ${detail.tenant_full_name}` : `SafeKey case: ${detail.tenant_full_name}`}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        {query.payment === "success" ? (
          <div className="status-message border-emerald-200 bg-emerald-50 text-emerald-800">
            Screening payment received. SafeKey can now generate the report once the admin review runs.
          </div>
        ) : null}
        {query.payment === "cancelled" ? (
          <div className="status-message border-[#e9dfc5] bg-[#fcfaf4] text-[#5d4e31]">
            Payment was canceled. This case remains unpaid until a screening checkout is completed.
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="card space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Secure upload link</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Applicant invitation</h2>
              </div>
              <Badge tone={detail.status === "report_ready" ? "success" : "info"}>
                {workflowStatus}
              </Badge>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="break-all text-sm text-slate-700">{detail.secure_upload_url ?? "No link generated"}</p>
            </div>
                {getCaseOriginBadgeLabel(id) ? (
                  <p className="text-xs leading-6 text-slate-500">
                    Sample case: preloaded upload route and screening outcome for walkthroughs only.
                  </p>
                ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Tenant email</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {detail.tenant_email ?? "Not provided yet"}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Link expiry</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatDate(detail.upload_token_expires_at)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Requested documents</p>
              <div className="flex flex-wrap gap-2">
                {detail.requested_documents.map((item) => (
                  <Badge key={item}>{item.replaceAll("_", " ")}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Billing status</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {billingEligibility.activeSubscription
                      ? "Covered by active subscription"
                      : billingEligibility.screeningPayment?.status === "paid"
                        ? "One-time screening paid"
                        : "Payment required before report generation"}
                  </p>
                </div>
                <Badge
                  tone={
                    billingEligibility.hasBillingAccess ? "success" : "warning"
                  }
                >
                  {billingEligibility.hasBillingAccess ? "Eligible" : "Pending payment"}
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-700">
                {billingEligibility.activeSubscription
                  ? "This tenant case is covered by your active SafeKey plan."
                  : billingEligibility.screeningPayment?.status === "paid"
                    ? "A one-time Stripe payment has been recorded for this screening."
                    : "Choose a plan or pay per screening to continue and activate this case."}
              </p>

              {!billingEligibility.hasBillingAccess ? (
                <div className="mt-4">
                  <ScreeningCheckoutForm checkId={detail.id} className="w-full" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="card space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Trust workflow report</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Version 1 screening summary</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Identity documents received</p>
                <p className="mt-2 text-sm text-slate-700">
                  {trustReport.identityReceived.length > 0
                    ? trustReport.identityReceived.map(getDocumentLabel).join(", ")
                    : "No identity documents uploaded yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Income documents received</p>
                <p className="mt-2 text-sm text-slate-700">
                  {trustReport.incomeReceived.length > 0
                    ? trustReport.incomeReceived.map(getDocumentLabel).join(", ")
                    : "No income documents uploaded yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Financial documents received</p>
                <p className="mt-2 text-sm text-slate-700">
                  {trustReport.financialReceived.length > 0
                    ? trustReport.financialReceived.map(getDocumentLabel).join(", ")
                    : "No financial documents uploaded yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Missing documents</p>
                <p className="mt-2 text-sm text-slate-700">
                  {trustReport.missingDocuments.length > 0
                    ? trustReport.missingDocuments.map(getDocumentLabel).join(", ")
                    : "No missing requested documents."}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Risk flags</p>
              <p className="mt-2 text-sm text-slate-700">
                {trustReport.riskFlags.length > 0 ? trustReport.riskFlags.join(" · ") : "No risk flags recorded yet."}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Analyst notes</p>
              <p className="mt-2 text-sm text-slate-700">{trustReport.analystNotes}</p>
              <p className="mt-3 text-sm font-semibold text-slate-950">Recommendation: {trustReport.recommendation}</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Screening report</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">SafeKey screening decision</h2>
            </div>

            {detail.ai_reports ? (
              <AiScreeningReport
                applicantName={detail.tenant_full_name}
                propertyMonthlyRent={detail.properties?.monthly_rent ?? null}
                report={detail.ai_reports}
                tenantMonthlyIncome={detail.tenant_public_profiles?.monthly_income ?? null}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                The report has not been generated yet. Once the admin review runs, the final score and
                recommendation will appear here.
              </div>
            )}
          </div>
        </section>

        <section className="card space-y-5" id="protection-options">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
                Insurance & Protection Eligibility
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Rental protection outlook</h2>
            </div>
            {protectionAssessment ? (
              <Badge tone={getEligibilityTone(protectionAssessment.status)}>
                {formatEligibilityStatus(protectionAssessment.status)}
              </Badge>
            ) : (
              <Badge tone="info">Pending report</Badge>
            )}
          </div>

          {protectionAssessment ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-500">Eligibility status</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatEligibilityStatus(protectionAssessment.status)}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {protectionAssessment.eligibilityReason}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-500">Recommended package</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {protectionAssessment.recommendedPackage ?? "No protection package recommended yet"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    Next action: {protectionAssessment.nextAction}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-500">Missing requirements</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                    {protectionAssessment.missingRequirements.length > 0 ? (
                      protectionAssessment.missingRequirements.map((item) => <li key={item}>• {item}</li>)
                    ) : (
                      <li>No additional protection requirements are currently highlighted.</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-500">Deposit protection option</p>
                  {protectionAssessment.depositQuote ? (
                    <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                      <p>{protectionAssessment.depositQuote.summary}</p>
                      <p>
                        Indicative deposit amount:{" "}
                        <span className="font-semibold text-slate-950">
                          {formatCurrency(protectionAssessment.depositQuote.traditionalDepositAmount)}
                        </span>
                      </p>
                      <p>
                        Indicative protection fee:{" "}
                        <span className="font-semibold text-slate-950">
                          {protectionAssessment.depositQuote.proposedProtectionFee == null
                            ? "Pending"
                            : formatCurrency(protectionAssessment.depositQuote.proposedProtectionFee)}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      Deposit protection will appear once the rent amount and report signals are available.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-[#0f2343]"
                  type="button"
                >
                  View Protection Options
                </button>
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-[#0f2343]"
                  type="button"
                >
                  Request Insurance Review
                </button>
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-[#0f2343]"
                  type="button"
                >
                  Generate Deposit Protection Quote
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {protectionAssessment.packageOptions.map((option) => (
                  <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={option.name}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-950">{option.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge tone={getEligibilityTone(option.eligibilityStatus)}>
                          {formatEligibilityStatus(option.eligibilityStatus)}
                        </Badge>
                        <Badge tone={option.label === "recommended" ? "success" : "neutral"}>
                          {option.label}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{option.description}</p>
                    <p className="mt-3 text-sm font-semibold text-[#0f2343]">{option.estimatedPrice}</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                      {option.coverageItems.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs leading-6 text-slate-500">{option.recommendationReason}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
              Generate the tenant risk report first. SafeKey will then prepare the insurance eligibility
              and deposit protection layer for this case.
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Applicant profile</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Submitted information</h2>
            </div>

            {detail.tenant_public_profiles ? (
              <dl className="grid gap-4 text-sm text-slate-700">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <dt className="text-slate-500">Employment status</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {detail.tenant_public_profiles.employment_status ?? "Not provided"}
                  </dd>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <dt className="text-slate-500">Employer</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {detail.tenant_public_profiles.employer_name ?? "Not provided"}
                  </dd>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <dt className="text-slate-500">Monthly income</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {formatCurrency(detail.tenant_public_profiles.monthly_income)}
                  </dd>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <dt className="text-slate-500">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap leading-7 text-slate-700">
                    {detail.tenant_public_profiles.notes ?? "No notes supplied"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                The tenant has not submitted their profile yet.
              </p>
            )}
          </div>

          <div className="card space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Uploaded files</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Document pack</h2>
            </div>

            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                  No files uploaded yet.
                </div>
              ) : (
                documents.map((document) => (
                  <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={document.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">{document.file_name}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {document.document_type.replaceAll("_", " ")} • Uploaded {formatDate(document.created_at)}
                        </p>
                      </div>
                      {document.signedUrl ? (
                        <Link
                          className="inline-flex items-center gap-2 text-sm font-medium text-[#0f2343]"
                          href={document.signedUrl}
                          target="_blank"
                        >
                          Open file
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      ) : getCaseOriginBadgeLabel(id) ? (
                        <Badge tone="info">Sample file state</Badge>
                      ) : null}
                    </div>
                    <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-7 text-slate-600">
                      {document.extracted_text ?? "No extracted text stored for this file."}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
