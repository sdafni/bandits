import type { PublicCheckDetail } from "@/lib/queries";
import {
  buildStoragePath,
  extractTextFromUpload,
  getUploadMimeType,
  validateUploadFiles,
} from "@/lib/documents";
import { getDocumentLabel } from "@/lib/trust-workflows";
import { getPublicCheckByToken } from "@/lib/queries";
import { resolveCheckDocumentPlan } from "@/lib/safekey-document-plan";
import {
  getPendingUploadDocumentTypesFromRequirements,
  normalizeDocumentType,
} from "@/lib/safekey-document-catalog";
import { isCheckDocumentPlanSubmissionComplete } from "@/lib/document-submission";
import { listTenantDocumentsForCheck } from "@/lib/check-persistence";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureTenantDocumentsBucket } from "@/lib/tenant-document-storage";

export type TenantUploadProfileInput = {
  consentConfirmed?: boolean;
  currentAddress?: string;
  email?: string;
  employerName?: string | null;
  employmentStatus?: string;
  fullName?: string;
  monthlyIncome?: number | null;
  moveInDate?: string | null;
  notes?: string | null;
  phone?: string;
};

export class TenantUploadError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function resolveActiveUploadCheck(token: string) {
  const check = await getPublicCheckByToken(token);

  if (!check) {
    throw new TenantUploadError("invalid_link", "This upload link is invalid or has expired.");
  }

  if (check.status === "draft" || !check.workflow_activated_at) {
    throw new TenantUploadError("inactive_workflow", "This screening workflow has not been activated yet.");
  }

  if (check.status === "report_ready") {
    throw new TenantUploadError(
      "complete",
      "This verification case is already complete. Contact the landlord if you need to submit additional documents.",
    );
  }

  return check;
}

function normalizeOptionalText(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function upsertTenantUploadProfile(check: PublicCheckDetail, profile: TenantUploadProfileInput) {
  const admin = createAdminClient();
  const existing = check.tenant_public_profiles;
  const payload = {
    consent_confirmed: profile.consentConfirmed ?? existing?.consent_confirmed ?? false,
    current_address:
      profile.currentAddress !== undefined
        ? normalizeOptionalText(profile.currentAddress)
        : existing?.current_address ?? null,
    email:
      profile.email !== undefined
        ? normalizeOptionalText(profile.email)?.toLowerCase() ?? null
        : existing?.email ?? null,
    employer_name:
      profile.employerName !== undefined
        ? normalizeOptionalText(profile.employerName)
        : existing?.employer_name ?? null,
    employment_status:
      profile.employmentStatus !== undefined
        ? normalizeOptionalText(profile.employmentStatus)
        : existing?.employment_status ?? null,
    full_name:
      profile.fullName !== undefined
        ? normalizeOptionalText(profile.fullName) ?? check.tenant_full_name
        : existing?.full_name ?? check.tenant_full_name,
    monthly_income:
      profile.monthlyIncome !== undefined
        ? profile.monthlyIncome != null && !Number.isNaN(profile.monthlyIncome)
          ? profile.monthlyIncome
          : null
        : existing?.monthly_income ?? null,
    monthly_rent: check.properties?.monthly_rent ?? null,
    move_in_date:
      profile.moveInDate !== undefined
        ? normalizeOptionalText(profile.moveInDate)
        : existing?.move_in_date ?? null,
    notes: profile.notes !== undefined ? normalizeOptionalText(profile.notes) : existing?.notes ?? null,
    phone: profile.phone !== undefined ? normalizeOptionalText(profile.phone) : existing?.phone ?? null,
    tenant_check_id: check.id,
  };

  const { error } = await admin.from("tenant_public_profiles").upsert(payload, { onConflict: "tenant_check_id" });

  if (error) {
    throw new TenantUploadError("profile_save_failed", error.message);
  }

  return payload;
}

export async function uploadTenantDocumentBatch(params: {
  check: PublicCheckDetail;
  documentType: string;
  files: File[];
  profile: TenantUploadProfileInput;
}) {
  const normalizedType = normalizeDocumentType(params.documentType);
  const documentPlan = resolveCheckDocumentPlan(params.check);
  const pendingTypes = getPendingUploadDocumentTypesFromRequirements(
    documentPlan.requirements,
    params.check.tenant_documents,
  );

  if (!pendingTypes.includes(normalizedType)) {
    throw new TenantUploadError(
      "already_uploaded",
      `${getDocumentLabel(normalizedType)} has already been uploaded for this check.`,
    );
  }

  const validationError = validateUploadFiles(params.files);
  if (validationError) {
    throw new TenantUploadError("invalid_files", validationError);
  }

  const admin = createAdminClient();
  await ensureTenantDocumentsBucket();
  await upsertTenantUploadProfile(params.check, params.profile);

  const uploadedDocumentIds: string[] = [];
  const uploadedStoragePaths: string[] = [];

  try {
    for (const file of params.files) {
      const duplicateOnCheck = params.check.tenant_documents.find(
        (document) =>
          document.file_name === file.name &&
          normalizeDocumentType(document.document_type) !== normalizedType,
      );

      if (duplicateOnCheck) {
        throw new TenantUploadError(
          "duplicate_file",
          `This file was already uploaded for ${getDocumentLabel(normalizeDocumentType(duplicateOnCheck.document_type))}. Upload a separate file for ${getDocumentLabel(normalizedType)}.`,
        );
      }
      const mimeType = getUploadMimeType(file);
      const storagePath = buildStoragePath(params.check.id, normalizedType, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const extraction = await extractTextFromUpload(file, {
        documentType: normalizedType,
        notes: params.profile.notes,
        profile: {
          employmentStatus: params.profile.employmentStatus,
          employerName: params.profile.employerName,
          monthlyIncome: params.profile.monthlyIncome ?? undefined,
        },
      });

      const { error: storageError } = await admin.storage.from("tenant-documents").upload(storagePath, buffer, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: false,
      });

      if (storageError) {
        throw new TenantUploadError("storage_upload_failed", `Could not upload ${file.name}. ${storageError.message}`);
      }

      uploadedStoragePaths.push(storagePath);

      const { data: document, error: documentError } = await admin
        .from("tenant_documents")
        .insert({
          document_type: normalizedType,
          extracted_text: extraction,
          file_name: file.name,
          file_size: file.size,
          mime_type: mimeType,
          storage_path: storagePath,
          tenant_check_id: params.check.id,
          uploaded_by_email: params.profile.email?.trim().toLowerCase() || null,
        })
        .select("id")
        .single();

      if (documentError) {
        throw new TenantUploadError(
          "document_metadata_failed",
          `Could not save metadata for ${file.name}. ${documentError.message}`,
        );
      }

      uploadedDocumentIds.push(document.id);
    }
  } catch (error) {
    if (uploadedDocumentIds.length > 0) {
      await admin.from("tenant_documents").delete().in("id", uploadedDocumentIds);
    }

    if (uploadedStoragePaths.length > 0) {
      await admin.storage.from("tenant-documents").remove(uploadedStoragePaths);
    }

    throw error;
  }

  const refreshedDocuments = await listTenantDocumentsForCheck(params.check.id);

  return {
    documentPlan,
    documentType: normalizedType,
    pendingUploadTypes: getPendingUploadDocumentTypesFromRequirements(
      documentPlan.requirements,
      refreshedDocuments,
    ),
    submissionReady: isCheckDocumentPlanSubmissionComplete(documentPlan, refreshedDocuments),
    tenantDocuments: refreshedDocuments,
  };
}
