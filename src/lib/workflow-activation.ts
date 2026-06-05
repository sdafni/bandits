import "server-only";

import { notifyTenantUploadInvitation } from "@/lib/notifications";
import { getCatalogDocumentLabel } from "@/lib/safekey-document-catalog";
import { resolveCheckDocumentPlan } from "@/lib/safekey-document-plan";
import { createSecureUploadCredentials } from "@/lib/secure-upload-link";
import { createAdminClient } from "@/lib/supabase/admin";

type TenantCheckRow = {
  id: string;
  status: string;
  tenant_email: string | null;
  tenant_full_name: string;
  workflow_activated_at: string | null;
  secure_upload_url: string | null;
  properties: { name: string } | null;
};

async function getRequestedDocumentsForInvitation(checkId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_checks")
    .select("document_requirements, requested_documents")
    .eq("id", checkId)
    .maybeSingle();

  if (!data) {
    return [];
  }

  const plan = resolveCheckDocumentPlan(data);
  return plan.requirements.map((requirement) => ({
    documentType: requirement.documentType,
    label: getCatalogDocumentLabel(requirement.documentType),
    priority: requirement.priority,
  }));
}

export async function getTenantCheckForActivation(checkId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_checks")
    .select("id, status, tenant_email, tenant_full_name, workflow_activated_at, secure_upload_url, properties(name)")
    .eq("id", checkId)
    .maybeSingle();

  if (error) {
    throw new Error(typeof error.message === "string" ? error.message : "Tenant check lookup failed.");
  }

  if (!data) {
    return null;
  }

  const record = data as Record<string, unknown>;
  return {
    id: String(record.id),
    status: String(record.status),
    tenant_email: (record.tenant_email as string | null) ?? null,
    tenant_full_name: String(record.tenant_full_name),
    workflow_activated_at: (record.workflow_activated_at as string | null) ?? null,
    secure_upload_url: (record.secure_upload_url as string | null) ?? null,
    properties: Array.isArray(record.properties)
      ? ((record.properties[0] as { name: string } | undefined) ?? null)
      : ((record.properties as { name: string } | null) ?? null),
  } satisfies TenantCheckRow;
}

export async function activateTenantWorkflowForCheck(
  checkId: string,
  options?: { resendEmail?: boolean; sendEmail?: boolean },
) {
  const sendEmail = options?.sendEmail !== false;
  const admin = createAdminClient();
  const check = await getTenantCheckForActivation(checkId);

  if (!check) {
    throw new Error("Tenant check not found.");
  }

  if (check.workflow_activated_at && check.secure_upload_url) {
    if (options?.resendEmail && check.tenant_email) {
      await notifyTenantUploadInvitation({
        propertyName: check.properties?.name ?? "Property",
        requestedDocuments: await getRequestedDocumentsForInvitation(checkId),
        tenantEmail: check.tenant_email,
        tenantName: check.tenant_full_name,
        uploadUrl: check.secure_upload_url,
      });
    }
    return { uploadUrl: check.secure_upload_url, alreadyActive: true as const };
  }

  const { token, tokenHash, uploadUrl, expiresAt } = createSecureUploadCredentials();
  const activatedAt = new Date().toISOString();

  const { error } = await admin
    .from("tenant_checks")
    .update({
      secure_upload_url: uploadUrl,
      status: "pending_upload",
      upload_token_expires_at: expiresAt,
      upload_token_hash: tokenHash,
      workflow_activated_at: activatedAt,
    })
    .eq("id", checkId);

  if (error) {
    throw new Error(typeof error.message === "string" ? error.message : "Failed to activate tenant workflow.");
  }

  if (sendEmail && check.tenant_email) {
    await notifyTenantUploadInvitation({
      propertyName: check.properties?.name ?? "Property",
      requestedDocuments: await getRequestedDocumentsForInvitation(checkId),
      tenantEmail: check.tenant_email,
      tenantName: check.tenant_full_name,
      uploadUrl,
    });
  }

  return { uploadUrl, token, alreadyActive: false as const };
}
