import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/badge";
import { GenerateReportForm } from "@/components/generate-report-form";
import { ProtectionReviewForm } from "@/components/protection-review-form";
import { isDemoCheckId } from "@/lib/demo-data";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import {
  buildProtectionAssessment,
  formatDepositQuoteSummary,
  formatEligibilityStatus,
  getEligibilityTone,
} from "@/lib/protection";
import { getAdminCheckDetail, getProtectionSnapshot } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review Case",
  description: "Inspect uploaded files and generate a SafeKey recommendation.",
};

const RECOMMENDATION_TONE = {
  approve: "success",
  conditional: "warning",
  decline: "danger",
} as const;

function formatMetricValue(value: number | null | undefined) {
  return value == null ? "Pending" : `${Math.round(value)}/100`;
}

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getAdminCheckDetail(id);

  if (!detail) {
    notFound();
  }

  const supabase = await createClient();
  const protectionSnapshot = await getProtectionSnapshot(id);
  const isDemoCase = isDemoCheckId(id);

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
          "Protection eligibility will appear after the report is generated.",
        manualOverrideNote: protectionSnapshot?.insuranceEligibility?.manual_override_note ?? null,
        missingRequirements:
          protectionSnapshot?.insuranceEligibility?.missing_requirements ??
          fallbackProtection?.missingRequirements ??
          [],
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

  return (
    <main className="min-h-screen">
      <AppHeader
        actions={
          <Link
            className="rounded-full border border-[#d8c490] px-4 py-2 text-sm font-medium text-[#0f2343] transition hover:bg-[#fffaf0]"
            href="/admin/review"
          >
            Back to queue
          </Link>
        }
        subtitle={`${detail.properties?.name ?? "Property"} • SafeKey review requested ${formatDate(detail.review_requested_at ?? detail.created_at)}`}
        title={`SafeKey review: ${detail.tenant_full_name}`}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Case overview</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Review status</h2>
              </div>
              <Badge tone={detail.status === "report_ready" ? "success" : "info"}>
                {detail.status.replaceAll("_", " ")}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Tenant email</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {detail.tenant_email ?? detail.tenant_public_profiles?.email ?? "Not provided"}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Property rent</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatCurrency(detail.properties?.monthly_rent)}
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

            {isDemoCase ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                Presentation case: this review record already includes a preloaded report and protection outcome.
              </div>
            ) : (
              <GenerateReportForm checkId={detail.id} />
            )}
          </div>

          <div className="card space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Applicant profile</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Submitted information</h2>
            </div>

            {detail.tenant_public_profiles ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Full name</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {detail.tenant_public_profiles.full_name ?? detail.tenant_full_name}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {detail.tenant_public_profiles.phone ?? "Not provided"}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Employment status</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {detail.tenant_public_profiles.employment_status ?? "Not provided"}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Employer</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {detail.tenant_public_profiles.employer_name ?? "Not provided"}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Monthly income</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatCurrency(detail.tenant_public_profiles.monthly_income)}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Current address</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {detail.tenant_public_profiles.current_address ?? "Not provided"}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2">
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap leading-7 text-slate-700">
                    {detail.tenant_public_profiles.notes ?? "No notes provided"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                The tenant profile has not been submitted yet.
              </div>
            )}
          </div>
        </section>

        {detail.ai_reports ? (
          <section className="card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Generated report</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Current SafeKey decision output</h2>
              </div>
              <Badge tone={RECOMMENDATION_TONE[detail.ai_reports.recommendation]}>
                {detail.ai_reports.recommendation}
              </Badge>
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-5xl font-semibold">{detail.ai_reports.score}</p>
              <p className="mt-2 text-sm text-slate-300">Trust score</p>
              <p className="mt-4 text-sm leading-7 text-slate-200">{detail.ai_reports.summary}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Identity confidence</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatMetricValue(detail.ai_reports.reasoning.identityConfidence)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Income stability</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatMetricValue(detail.ai_reports.reasoning.incomeStability)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Rent affordability</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatMetricValue(detail.ai_reports.reasoning.rentAffordability)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Employment / residency</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatMetricValue(detail.ai_reports.reasoning.employmentResidencyConfidence)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Document completeness</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatMetricValue(detail.ai_reports.reasoning.documentCompleteness)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Red flags</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {detail.ai_reports.red_flags.length > 0 ? (
                    detail.ai_reports.red_flags.map((flag) => <li key={flag}>• {flag}</li>)
                  ) : (
                    <li>None highlighted</li>
                  )}
                </ul>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Strengths</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {detail.ai_reports.strengths.length > 0 ? (
                    detail.ai_reports.strengths.map((item) => <li key={item}>• {item}</li>)
                  ) : (
                    <li>None highlighted</li>
                  )}
                </ul>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Missing documents</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {detail.ai_reports.missing_documents.length > 0 ? (
                    detail.ai_reports.missing_documents.map((item) => <li key={item}>• {item}</li>)
                  ) : (
                    <li>Complete pack</li>
                  )}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        <section className="card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Protection review</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Insurance & deposit protection layer</h2>
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
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Eligibility status</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {formatEligibilityStatus(protectionAssessment.status)}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {protectionAssessment.eligibilityReason}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Risk score</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {protectionAssessment.riskScore}/100
                      </p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Recommended package</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {protectionAssessment.recommendedPackage ?? "No package recommended"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Missing documents & requirements</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                      {protectionAssessment.missingRequirements.length > 0 ? (
                        protectionAssessment.missingRequirements.map((item) => <li key={item}>• {item}</li>)
                      ) : (
                        <li>No additional protection blockers are highlighted right now.</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Deposit protection quote</p>
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
                        Deposit protection pricing will appear once the rent and risk signals are available.
                      </p>
                    )}
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Manual override</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {protectionAssessment.manualOverrideNote ?? "No admin override has been recorded yet."}
                    </p>
                  </div>

                  {isDemoCase ? (
                    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f2343]" type="button">
                          Approve
                        </button>
                        <button className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f2343]" type="button">
                          Conditional approval
                        </button>
                        <button className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f2343]" type="button">
                          Reject
                        </button>
                        <button className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f2343]" type="button">
                          Override protection eligibility
                        </button>
                      </div>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Manual note</span>
                        <textarea
                          className="input min-h-[120px] resize-y"
                          defaultValue={protectionAssessment.manualOverrideNote ?? "Presentation note: hold the current protection recommendation until final underwriting review."}
                          readOnly
                        />
                      </label>
                    </div>
                  ) : (
                    <ProtectionReviewForm checkId={detail.id} />
                  )}
                </div>
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
              Generate the tenant risk report first. The protection review layer depends on the screening score
              and uploaded document set.
            </div>
          )}
        </section>

        <section className="card space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Files and extracted text</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Document review panel</h2>
          </div>

          <div className="space-y-4">
            {documents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                No files uploaded yet for this case.
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
                    ) : isDemoCase ? (
                      <Badge tone="info">Demo file state</Badge>
                    ) : null}
                  </div>
                  <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-7 text-slate-600">
                    {document.extracted_text ?? "No extracted text stored for this file."}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
