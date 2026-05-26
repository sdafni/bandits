import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { TenantUploadForm } from "@/components/tenant-upload-form";
import { isDemoUploadToken } from "@/lib/demo-data";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { WorkspaceRibbon } from "@/components/workspace-ribbon";
import type { Database } from "@/lib/database.types";
import { hasSupabaseServiceEnv } from "@/lib/env";
import { getComplianceIndicators, getOperationalState, getVerificationChecklist } from "@/lib/operations";
import { getPublicCheckByToken } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate } from "@/lib/utils";

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
    notFound();
  }

  const documents = isDemoToken
    ? detail.tenant_documents.map((document: Database["public"]["Tables"]["tenant_documents"]["Row"]) => ({
        ...document,
        signedUrl: null,
      }))
    : await createLiveSignedDocuments(detail.tenant_documents);
  const operationalState = getOperationalState(detail.status);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:py-16">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <WorkspaceRibbon
          items={[
            { href: "/", label: "SafeKey" },
            { active: true, label: "Secure upload" },
            { label: "Tenant document flow" },
          ]}
          statusLabel="Protected access"
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
              <h1 className="text-3xl font-semibold text-slate-950">Complete your SafeKey verification pack</h1>
              <p className="text-sm leading-7 text-slate-600">
                Upload the requested documents securely for {detail.properties?.name ?? "the selected property"}.
                This page is designed for both local and expat tenants applying in the Greek rental market.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Property</p>
                <p className="mt-1 font-semibold text-slate-950">{detail.properties?.name ?? "Property"}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.properties?.address_line1}, {detail.properties?.city}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Monthly rent</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatCurrency(detail.properties?.monthly_rent)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Link expires {formatDate(detail.upload_token_expires_at)}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#dbe2eb] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Verification progression</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>{operationalState.analystState}</p>
                  <p>{operationalState.nextStep}</p>
                  <p>Upload window closes {formatDate(detail.upload_token_expires_at)}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-[#dbe2eb] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Greek market checks</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getVerificationChecklist(detail.requested_documents).map((item) => (
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
              Your documents are stored securely in SafeKey and are only available to the landlord, property
              professional, and authorized review staff assigned to this verification case.
            </div>

            <div className="rounded-3xl border border-[#dbe2eb] bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">Compliance indicators</p>
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
              <TenantUploadForm tenantName={detail.tenant_full_name} token={token} />
            )}
          </section>
        </section>

        <section className="card space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5a6980]">Already uploaded</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Current document pack</h2>
          </div>

          <div className="space-y-4">
            {documents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                No documents uploaded yet.
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
                    <Badge tone="info">Stored for review</Badge>
                    {document.signedUrl ? (
                      <Link
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#0f2343]"
                        href={document.signedUrl}
                        target="_blank"
                      >
                        Open file
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

async function createLiveSignedDocuments(
  documents: Database["public"]["Tables"]["tenant_documents"]["Row"][],
) {
  const admin = createAdminClient();

  return Promise.all(
    documents.map(async (document: Database["public"]["Tables"]["tenant_documents"]["Row"]) => {
      const { data } = await admin.storage
        .from("tenant-documents")
        .createSignedUrl(document.storage_path, 60 * 60);

      return {
        ...document,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );
}
