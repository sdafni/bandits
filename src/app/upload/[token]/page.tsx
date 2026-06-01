import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/badge";
import { TenantUploadForm } from "@/components/tenant-upload-form";
import { RecoveryNavigationActions } from "@/components/recovery-navigation-actions";
import { isDemoUploadToken } from "@/lib/demo-data";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { WorkspaceRibbon } from "@/components/workspace-ribbon";
import type { Database } from "@/lib/database.types";
import { hasSupabaseServiceEnv } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveCheckDocumentPlan } from "@/lib/safekey-document-plan";
import { getComplianceIndicators, getTenantUploadOperationalState, getVerificationChecklist } from "@/lib/operations";
import { getPublicCheckByToken } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/security";
import { SafeKeyScoreboardPanel } from "@/components/safekey-scoreboard";
import { TenantDocumentStatusBadge } from "@/components/tenant-document-status";
import { resolveDocumentCollectionPhase } from "@/lib/document-submission";
import { normalizeDocumentReviewStatus } from "@/lib/document-review";
import { translate } from "@/lib/i18n/messages";
import type { TenantUploadProfileDraft } from "@/lib/tenant-upload-draft";
import { getRequestLocale } from "@/lib/i18n-server";
import { buildSafeKeyScoreboard } from "@/lib/safekey-scoreboard";

function profileDraftFromDatabase(
  profile: Database["public"]["Tables"]["tenant_public_profiles"]["Row"] | null,
  tenantName: string,
): TenantUploadProfileDraft | null {
  if (!profile) {
    return null;
  }

  return {
    consentConfirmed: profile.consent_confirmed,
    currentAddress: profile.current_address ?? "",
    email: profile.email ?? "",
    employerName: profile.employer_name ?? "",
    employmentStatus: profile.employment_status ?? "",
    fullName: profile.full_name ?? tenantName,
    monthlyIncome: profile.monthly_income != null ? String(profile.monthly_income) : "",
    moveInDate: profile.move_in_date ?? "",
    notes: profile.notes ?? "",
    phone: profile.phone ?? "",
  };
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Secure Upload",
  description: "Submit documents to SafeKey through a secure Tenant Passport Greece upload link.",
};

export default async function TenantUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getRequestLocale();
  const t = (key: string, vars?: Record<string, string | number>) => {
    let value = translate(locale, key);
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }
    return value;
  };
  const isDemoToken = isDemoUploadToken(token);

  if (!hasSupabaseServiceEnv() && !isDemoToken) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-6">
          <WorkspaceRibbon
            items={[
              { href: "/", label: "SafeKey" },
              { active: true, label: "Secure upload" },
              { label: "Document submission" },
            ]}
            statusLabel="Protected access"
          />

          <section className="card space-y-3">
            <h1 className="text-2xl font-semibold text-slate-950">Secure uploads are not configured yet</h1>
            <p className="text-sm leading-7 text-slate-600">
              This upload workspace is not available right now. Please try again later or contact the SafeKey team.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const detail = await getPublicCheckByToken(token);

  if (!detail) {
    const linkStatus = await getUploadLinkStatus(token);
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <section className="card w-full max-w-xl space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b6b17]">Secure upload access</p>
          <h1 className="text-3xl font-semibold text-slate-950">
            {linkStatus === "expired" ? "This secure upload link has expired." : "This secure upload link is unavailable."}
          </h1>
          <p className="text-sm leading-7 text-slate-600">
            {linkStatus === "expired"
              ? "For security reasons, upload links expire automatically. Your data remains safe and your landlord can issue a new link."
              : "The link is invalid, already used, or no longer available. Your data is safe."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link className="workspace-cta" href="/#support">
              Request new link
            </Link>
            <Link className="workspace-cta-secondary" href="/#support">
              Contact landlord
            </Link>
          </div>
          <RecoveryNavigationActions />
        </section>
      </main>
    );
  }

  const documents = isDemoToken
    ? detail.tenant_documents.map((document: Database["public"]["Tables"]["tenant_documents"]["Row"]) => ({
        ...document,
        signedUrl: null,
      }))
    : await createLiveSignedDocuments(detail.tenant_documents);
  const documentPlan = resolveCheckDocumentPlan(detail);
  const collectionPhase = resolveDocumentCollectionPhase({
    document_requirements: documentPlan.requirements,
    requested_documents: documentPlan.requestedDocuments,
    status: detail.status,
    tenant_documents: documents,
  });
  const operationalState = getTenantUploadOperationalState({
    document_requirements: documentPlan.requirements,
    requested_documents: documentPlan.requestedDocuments,
    status: detail.status,
    tenant_documents: documents,
  });
  const scoreboard = buildSafeKeyScoreboard({
    document_requirements: documentPlan.requirements,
    requested_documents: documentPlan.requestedDocuments,
    status: detail.status,
    tenant_documents: documents,
  });
  const landlordDisplayName =
    detail.landlord?.company_name?.trim() || detail.landlord?.full_name?.trim() || null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:py-16">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <WorkspaceRibbon
          items={[
            { href: "/", label: t("tenantUpload.ribbonHome") },
            { active: true, label: t("tenantUpload.ribbonUpload") },
            { label: t("tenantUpload.ribbonStep") },
          ]}
          statusLabel={t("tenantUpload.statusProtected")}
        />

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="brand-visual-card">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <SafeKeyBrand href="/" variant="compact" />
                <div className="space-y-0.5">
                  <Link className="inline-flex items-center text-sm font-semibold text-[#0f2343]" href="/">
                    SafeKey
                  </Link>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Tenant Passport Greece</p>
                </div>
              </div>
              <h1 className="text-3xl font-semibold text-slate-950">{t("tenantUpload.title")}</h1>
              <p className="text-sm leading-7 text-slate-600">
                {t("tenantUpload.body", {
                  property: detail.properties?.name ?? t("tenantUpload.property"),
                })}
              </p>
              {landlordDisplayName ? (
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{t("tenantUpload.requestedBy")}:</span> {landlordDisplayName}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{t("tenantUpload.property")}</p>
                <p className="mt-1 font-semibold text-slate-950">{detail.properties?.name ?? "Property"}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.properties?.address_line1}, {detail.properties?.city}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{t("tenantUpload.monthlyRent")}</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatCurrency(detail.properties?.monthly_rent)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Link expires {formatDate(detail.upload_token_expires_at)}
                </p>
              </div>
            </div>

            <SafeKeyScoreboardPanel
              locale={locale}
              scoreboard={scoreboard}
              title={t("tenantUpload.requestedDocuments")}
            />
            {collectionPhase.phase === "partial_submission" ? (
              <p className="text-xs text-amber-800">{t("tenantUpload.applicationIncomplete")}</p>
            ) : null}
            <p className="text-xs text-muted">{t("tenantUpload.uploadHint")}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#dbe2eb] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">{t("tenantUpload.progressTitle")}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>{operationalState.analystState}</p>
                  <p>{operationalState.nextStep}</p>
                  <p>Upload window closes {formatDate(detail.upload_token_expires_at)}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-[#dbe2eb] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">{t("tenantUpload.checksTitle")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getVerificationChecklist(documentPlan.requestedDocuments).map((item) => (
                    <span
                      className="rounded-full border border-[#dbe2eb] bg-[#fbfcfe] px-3 py-1.5 text-xs font-medium text-[#42526b]"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#dbe2eb] bg-white px-4 py-4 text-sm leading-7 text-[#0f2343]">
              {t("tenantUpload.privacyNote")}
            </div>

            <div className="rounded-3xl border border-[#dbe2eb] bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">{t("tenantUpload.securityTitle")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {getComplianceIndicators(detail.status).map((item) => (
                  <span
                    className="rounded-full border border-[#dbe2eb] bg-[#fbfcfe] px-3 py-1.5 text-xs font-medium text-[#42526b]"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="brand-visual-frame">
              <Image
                alt="SafeKey secure upload illustration"
                className="h-auto w-full rounded-[24px]"
                height={640}
                src="/brand/safekey/ui-visuals/secure-upload-visual.svg"
                width={900}
              />
            </div>
          </div>

          <section className="card space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Upload form</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {isDemoToken ? "Presentation upload state" : "Submit documents and profile"}
              </h2>
            </div>
            {isDemoToken ? (
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                <p>
                  This presentation route shows a preloaded upload workspace for partner walkthroughs. It displays
                  realistic document states without writing new data to Supabase.
                </p>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  Presentation state: applicant documents are already submitted and prepared for review.
                </div>
              </div>
            ) : (
              <TenantUploadForm
                checkStatus={detail.status}
                documentPlan={documentPlan}
                initialTenantDocuments={documents}
                savedProfile={profileDraftFromDatabase(detail.tenant_public_profiles, detail.tenant_full_name)}
                tenantName={detail.tenant_full_name}
                token={token}
              />
            )}
          </section>
        </section>

        <section className="card space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">{t("tenantUpload.uploadedTitle")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("tenantUpload.uploadedHeading")}</h2>
          </div>

          <div className="space-y-4">
            {documents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                {t("tenantUpload.noDocuments")}
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
                    <TenantDocumentStatusBadge
                      locale={locale}
                      status={normalizeDocumentReviewStatus(document.upload_status)}
                    />
                    {document.signedUrl ? (
                      <Link
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#0f2343]"
                        href={document.signedUrl}
                        target="_blank"
                      >
                        {t("tenantUpload.openFile")}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : isDemoToken ? (
                      <Badge tone="info">Presentation file state</Badge>
                    ) : null}
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

async function getUploadLinkStatus(token: string): Promise<"expired" | "invalid"> {
  if (!hasSupabaseServiceEnv() || isDemoUploadToken(token)) {
    return "invalid";
  }

  const admin = createAdminClient();
  const tokenHash = hashToken(token);
  const { data } = await admin
    .from("tenant_checks")
    .select("upload_token_expires_at")
    .eq("upload_token_hash", tokenHash)
    .maybeSingle();

  if (!data?.upload_token_expires_at) {
    return "invalid";
  }

  return new Date(data.upload_token_expires_at).getTime() < Date.now() ? "expired" : "invalid";
}

async function createLiveSignedDocuments(
  documents: Database["public"]["Tables"]["tenant_documents"]["Row"][],
) {
  const admin = createAdminClient();

  return Promise.all(
    documents.map(async (document: Database["public"]["Tables"]["tenant_documents"]["Row"]) => {
      try {
        const { data, error } = await admin.storage
          .from("tenant-documents")
          .createSignedUrl(document.storage_path, 60 * 60);

        if (error) {
          console.error("[safekey-upload:signed-url]", {
            documentId: document.id,
            message: error.message,
            storagePath: document.storage_path,
          });
        }

        return {
          ...document,
          signedUrl: data?.signedUrl ?? null,
        };
      } catch (error) {
        console.error("[safekey-upload:signed-url]", {
          documentId: document.id,
          message: error instanceof Error ? error.message : String(error),
          storagePath: document.storage_path,
        });

        return {
          ...document,
          signedUrl: null,
        };
      }
    }),
  );
}
