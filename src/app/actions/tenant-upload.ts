"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { runDeferredUploadAnalysis } from "@/app/actions";
import { z } from "zod";
import type { ActionState } from "@/app/actions";
import { isDemoUploadToken } from "@/lib/demo-data";
import {
  formEntry,
  optionalFormEntry,
  parseFormSchema,
  preprocessFormNumber,
  preprocessFormString,
  preprocessOptionalFormString,
} from "@/lib/form-validation";
import { listTenantDocumentsForCheck } from "@/lib/check-persistence";
import { hasSupabaseServiceEnv } from "@/lib/env";
import { notifyLandlordDocumentsReceived } from "@/lib/notifications";
import { getDocumentUploadFieldName } from "@/lib/document-submission";
import { getDocumentLabel } from "@/lib/trust-workflows";
import {
  resolveActiveUploadCheck,
  TenantUploadError,
  markCreditReportRequested,
  uploadTenantDocumentBatch,
  upsertTenantUploadProfile,
  type TenantUploadProfileInput,
} from "@/lib/tenant-upload-service";
import { isCheckDocumentPlanSubmissionComplete } from "@/lib/document-submission";
import { CREDIT_REPORT_DOCUMENT_TYPE, normalizeDocumentType } from "@/lib/safekey-document-catalog";
import { resolveCheckDocumentPlan } from "@/lib/safekey-document-plan";
import { getUploadedDocumentTypes } from "@/lib/document-submission";
import { createAdminClient } from "@/lib/supabase/admin";

const optionalDraftEmailSchema = z.preprocess(
  preprocessFormString,
  z
    .string()
    .trim()
    .max(240)
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: "A valid email is required.",
    }),
);

const profileDraftSchema = z.object({
  consentConfirmed: z.preprocess(
    (value) => value === true || value === "on" || value === "true",
    z.boolean().optional(),
  ),
  creditReportConsent: z.preprocess(
    (value) => value === true || value === "on" || value === "true",
    z.boolean().optional(),
  ),
  currentAddress: z.preprocess(preprocessFormString, z.string().trim().max(240)),
  email: optionalDraftEmailSchema,
  employerName: z.preprocess(preprocessFormString, z.string().trim().max(120)),
  employmentStatus: z.preprocess(preprocessFormString, z.string().trim().max(80)),
  fullName: z.preprocess(preprocessFormString, z.string().trim().max(120)),
  monthlyIncome: z.preprocess(preprocessFormString, z.string().trim().max(40)),
  moveInDate: z.preprocess(preprocessFormString, z.string().trim().max(40)),
  notes: z.preprocess(preprocessFormString, z.string().trim().max(2000)),
  phone: z.preprocess(preprocessFormString, z.string().trim().max(40)),
});

const submitApplicationSchema = profileDraftSchema.extend({
  consentConfirmed: z.preprocess(
    (value) => value === true || value === "on" || value === "true",
    z.boolean().refine((value) => value, {
      message: "Consent must be confirmed before upload.",
    }),
  ),
  currentAddress: z.preprocess(
    preprocessFormString,
    z.string().trim().min(8, "Current address is required."),
  ),
  email: z.preprocess(
    preprocessFormString,
    z.string().trim().email("A valid email is required."),
  ),
  employmentStatus: z.preprocess(
    preprocessFormString,
    z.string().trim().min(2, "Employment status is required."),
  ),
  fullName: z.preprocess(
    preprocessFormString,
    z.string().trim().min(2, "Full name is required."),
  ),
  monthlyIncome: z.preprocess(
    preprocessFormNumber,
    z.number({ error: "Monthly income is required." }).positive("Monthly income must be positive."),
  ),
  phone: z.preprocess(
    preprocessFormString,
    z.string().trim().min(6, "Phone number is required."),
  ),
});

export type TenantUploadActionState = ActionState & {
  documentType?: string;
  pendingUploadTypes?: string[];
  submissionReady?: boolean;
  tenantDocuments?: Array<{ created_at?: string; document_type: string; upload_status?: string | null }>;
  uploadedDocumentTypes?: string[];
};

function parseProfileDraft(formData: FormData) {
  return parseFormSchema(profileDraftSchema, {
    consentConfirmed: formData.get("consent_confirmed") === "on",
    creditReportConsent: formData.get("credit_report_consent") === "on",
    currentAddress: formEntry(formData.get("current_address")),
    email: formEntry(formData.get("email")),
    employerName: formEntry(formData.get("employer_name")),
    employmentStatus: formEntry(formData.get("employment_status")),
    fullName: formEntry(formData.get("full_name")),
    monthlyIncome: formEntry(formData.get("monthly_income")),
    moveInDate: formEntry(formData.get("move_in_date")),
    notes: formEntry(formData.get("notes")),
    phone: formEntry(formData.get("phone")),
  });
}

function parseDraftMonthlyIncome(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toProfileInput(
  data: z.infer<typeof profileDraftSchema> | z.infer<typeof submitApplicationSchema>,
): TenantUploadProfileInput {
  const monthlyIncome =
    typeof data.monthlyIncome === "number"
      ? data.monthlyIncome
      : parseDraftMonthlyIncome(String(data.monthlyIncome ?? ""));

  return {
    consentConfirmed: data.consentConfirmed,
    creditReportConsent: data.creditReportConsent,
    currentAddress: data.currentAddress,
    email: data.email,
    employerName: data.employerName,
    employmentStatus: data.employmentStatus,
    fullName: data.fullName,
    monthlyIncome,
    moveInDate: data.moveInDate,
    notes: data.notes,
    phone: data.phone,
  };
}

function revalidateTenantUploadPage(token: string) {
  revalidatePath(`/upload/${token}`);
}

function revalidateCaseReviewPaths(checkId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/checks/${checkId}`);
  revalidatePath("/admin/review");
  revalidatePath(`/admin/review/${checkId}`);
}

export async function markCreditReportRequestedAction(token: string): Promise<TenantUploadActionState> {
  try {
    if (isDemoUploadToken(token)) {
      return { success: "Credit report request recorded for the presentation upload link." };
    }

    if (!hasSupabaseServiceEnv()) {
      return { error: "Secure uploads are not configured yet." };
    }

    const check = await resolveActiveUploadCheck(token);
    await markCreditReportRequested(check);
    revalidateTenantUploadPage(token);

    return { success: "Credit report request recorded." };
  } catch (error) {
    if (error instanceof TenantUploadError) {
      return { error: error.message };
    }

    return {
      error: error instanceof Error ? error.message : "Could not record your credit report request.",
    };
  }
}

export async function saveTenantUploadProfileAction(
  token: string,
  _prevState: TenantUploadActionState,
  formData: FormData,
): Promise<TenantUploadActionState> {
  try {
    if (isDemoUploadToken(token)) {
      return { success: "Draft saved for the presentation upload link." };
    }

    if (!hasSupabaseServiceEnv()) {
      return { error: "Secure uploads are not configured yet." };
    }

    const parsed = parseProfileDraft(formData);
    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    const check = await resolveActiveUploadCheck(token);
    await upsertTenantUploadProfile(check, toProfileInput(parsed.data));

    return { success: "Your details were saved automatically." };
  } catch (error) {
    if (error instanceof TenantUploadError) {
      return { error: error.message };
    }

    return { error: error instanceof Error ? error.message : "Could not save your details." };
  }
}

export async function uploadTenantDocumentAction(
  token: string,
  documentType: string,
  _prevState: TenantUploadActionState,
  formData: FormData,
): Promise<TenantUploadActionState> {
  try {
    if (isDemoUploadToken(token)) {
      return { success: "Document saved for the presentation upload link.", documentType };
    }

    if (!hasSupabaseServiceEnv()) {
      return { error: "Secure uploads are not configured yet." };
    }

    const parsed = parseProfileDraft(formData);
    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors, documentType };
    }

    const files = formData
      .getAll(getDocumentUploadFieldName(documentType))
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return { error: `Select a file for ${getDocumentLabel(documentType)} before uploading.`, documentType };
    }

    if (
      normalizeDocumentType(documentType) === CREDIT_REPORT_DOCUMENT_TYPE &&
      !parsed.data.creditReportConsent
    ) {
      return {
        error: "Confirm credit report consent before uploading this document.",
        documentType,
      };
    }

    const check = await resolveActiveUploadCheck(token);
    const result = await uploadTenantDocumentBatch({
      check,
      documentType,
      files,
      profile: toProfileInput(parsed.data),
    });

    revalidateTenantUploadPage(token);
    revalidateCaseReviewPaths(check.id);

    return {
      success: `${getDocumentLabel(result.documentType)} uploaded successfully.`,
      documentType: result.documentType,
      pendingUploadTypes: result.pendingUploadTypes,
      submissionReady: result.submissionReady,
      tenantDocuments: result.tenantDocuments,
    };
  } catch (error) {
    if (error instanceof TenantUploadError) {
      return { error: error.message, documentType };
    }

    return {
      error: error instanceof Error ? error.message : "Could not upload this document.",
      documentType,
    };
  }
}

export async function submitTenantApplicationAction(
  token: string,
  _prevState: TenantUploadActionState,
  formData: FormData,
): Promise<TenantUploadActionState> {
  try {
    if (isDemoUploadToken(token)) {
      return { success: "Application submitted for the presentation upload link." };
    }

    if (!hasSupabaseServiceEnv()) {
      return { error: "Secure uploads are not configured yet." };
    }

    const parsed = parseFormSchema(submitApplicationSchema, {
      consentConfirmed: formData.get("consent_confirmed") === "on",
      creditReportConsent: formData.get("credit_report_consent") === "on",
      currentAddress: formEntry(formData.get("current_address")),
      email: formEntry(formData.get("email")),
      employerName: optionalFormEntry(formData.get("employer_name")),
      employmentStatus: formEntry(formData.get("employment_status")),
      fullName: formEntry(formData.get("full_name")),
      monthlyIncome: formEntry(formData.get("monthly_income")),
      moveInDate: optionalFormEntry(formData.get("move_in_date")),
      notes: optionalFormEntry(formData.get("notes")),
      phone: formEntry(formData.get("phone")),
    });

    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    const check = await resolveActiveUploadCheck(token);
    const profile = toProfileInput(parsed.data);
    await upsertTenantUploadProfile(check, { ...profile, consentConfirmed: true });

    const documentPlan = resolveCheckDocumentPlan(check);
    const tenantDocuments = await listTenantDocumentsForCheck(check.id);
    if (!isCheckDocumentPlanSubmissionComplete(documentPlan, tenantDocuments)) {
      return {
        error: "Upload all required documents before submitting your application.",
      };
    }

    const admin = createAdminClient();
    const { error: reportDeleteError } = await admin.from("ai_reports").delete().eq("tenant_check_id", check.id);

    if (reportDeleteError) {
      return { error: `Could not refresh the review pipeline. ${reportDeleteError.message}` };
    }

    const { error: checkUpdateError } = await admin
      .from("tenant_checks")
      .update({
        review_completed_at: null,
        review_requested_at: new Date().toISOString(),
        status: "documents_received",
      })
      .eq("id", check.id);

    if (checkUpdateError) {
      return { error: checkUpdateError.message };
    }

    await notifyLandlordDocumentsReceived({
      landlordId: check.landlord_id,
      checkId: check.id,
      tenantName: check.tenant_full_name,
      propertyName: check.properties?.name ?? "Property",
    }).catch(() => undefined);

    const analysisContext = {
      checkId: check.id,
      landlordId: check.landlord_id,
      propertyName: check.properties?.name ?? "Property",
      tenantName: check.tenant_full_name,
      token,
    };

    after(async () => {
      try {
        await runDeferredUploadAnalysis(analysisContext);
      } catch (error) {
        console.error(
          "[safekey-upload:deferred-analysis]",
          JSON.stringify({
            checkId: analysisContext.checkId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    });

    revalidateTenantUploadPage(token);
    revalidateCaseReviewPaths(check.id);

    return {
      success:
        "Your complete application was submitted successfully. SafeKey will review your documents and update your landlord when the report is ready.",
      submissionReady: true,
    };
  } catch (error) {
    if (error instanceof TenantUploadError) {
      return { error: error.message };
    }

    return { error: error instanceof Error ? error.message : "Could not submit your application." };
  }
}
