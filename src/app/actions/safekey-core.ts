"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/app/actions";
import { requireAdmin, requireLandlord } from "@/lib/auth";
import { isDemoCheckId } from "@/lib/demo-data";
import { formEntry, parseFormSchema } from "@/lib/form-validation";
import { hasSupabaseServiceEnv } from "@/lib/env";
import {
  notifyTenantDocumentRejected,
  notifyTenantMissingDocumentsRequested,
} from "@/lib/notifications";
import { getAdminCheckDetail, getLandlordCheckDetail } from "@/lib/queries";
import { isRequiredDocumentSubmissionComplete } from "@/lib/safekey-document-catalog";
import { getCatalogDocumentLabel } from "@/lib/safekey-document-catalog";
import { createAdminClient } from "@/lib/supabase/admin";

const requestMissingSchema = z.object({
  documentTypes: z.array(z.string().trim().min(1)).min(1, "Select at least one document category."),
  message: z.string().trim().max(1000).optional(),
});

const rejectDocumentSchema = z.object({
  documentId: z.string().uuid(),
  reason: z.string().trim().min(3, "Provide a short rejection reason.").max(1000),
});

const reviewerNoteSchema = z.object({
  body: z.string().trim().min(3, "Add a note before saving.").max(2000),
});

const landlordDecisionSchema = z.object({
  decision: z.enum(["approved", "declined", "conditional"]),
  notes: z.string().trim().max(2000).optional(),
});

type CaseAccess = {
  authorRole: "admin" | "landlord";
  checkId: string;
  demo: boolean;
  profileId: string;
};

async function resolveCaseAccess(checkId: string, asAdmin = false): Promise<CaseAccess> {
  if (isDemoCheckId(checkId)) {
    return { authorRole: asAdmin ? "admin" : "landlord", checkId, demo: true, profileId: "demo" };
  }

  if (!hasSupabaseServiceEnv()) {
    throw new Error("SafeKey Core is not configured yet.");
  }

  if (asAdmin) {
    const { profile } = await requireAdmin();
    const detail = await getAdminCheckDetail(checkId);
    if (!detail) {
      throw new Error("This tenant check could not be found.");
    }
    return { authorRole: "admin", checkId, demo: false, profileId: profile.id };
  }

  const { profile } = await requireLandlord();
  const detail = await getLandlordCheckDetail(checkId);
  if (!detail || detail.landlord_id !== profile.id) {
    throw new Error("You do not have access to this tenant check.");
  }

  return { authorRole: "landlord", checkId, demo: false, profileId: profile.id };
}

async function insertReviewerNote(params: {
  authorId: string;
  authorRole: "admin" | "landlord";
  body: string;
  checkId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("case_reviewer_notes").insert({
    author_id: params.authorId,
    author_role: params.authorRole,
    body: params.body,
    tenant_check_id: params.checkId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function revalidateCasePaths(checkId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/checks/${checkId}`);
  revalidatePath("/admin/review");
  revalidatePath(`/admin/review/${checkId}`);
}

export async function requestMissingDocumentsAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const asAdmin = formData.get("as_admin") === "on";
    const access = await resolveCaseAccess(checkId, asAdmin);
    const documentTypes = formData.getAll("document_types").map((value) => String(value));
    const parsed = parseFormSchema(requestMissingSchema, {
      documentTypes,
      message: formEntry(formData.get("message")) || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    if (access.demo) {
      return { success: "Missing document request recorded for the presentation case." };
    }

    const detail = asAdmin ? await getAdminCheckDetail(checkId) : await getLandlordCheckDetail(checkId);
    if (!detail) {
      return { error: "This tenant check could not be found." };
    }

    const admin = createAdminClient();
    const mergedDocuments = [...new Set([...detail.requested_documents, ...parsed.data.documentTypes])];
    const nextStatus =
      detail.status === "report_ready" ||
      detail.status === "under_review" ||
      detail.status === "documents_received"
        ? "pending_upload"
        : detail.status;

    const { error: updateError } = await admin
      .from("tenant_checks")
      .update({
        requested_documents: mergedDocuments,
        review_completed_at: null,
        status: nextStatus,
      })
      .eq("id", checkId);

    if (updateError) {
      return { error: updateError.message };
    }

    const noteBody = parsed.data.message
      ? `Requested missing documents: ${parsed.data.documentTypes.join(", ")}. ${parsed.data.message}`
      : `Requested missing documents: ${parsed.data.documentTypes.join(", ")}.`;

    await insertReviewerNote({
      authorId: access.profileId,
      authorRole: access.authorRole,
      body: noteBody,
      checkId,
    }).catch(() => undefined);

    if (detail.tenant_email && detail.secure_upload_url) {
      await notifyTenantMissingDocumentsRequested({
        documentLabels: parsed.data.documentTypes.map(getCatalogDocumentLabel),
        message: parsed.data.message,
        propertyName: detail.properties?.name ?? "Property",
        tenantEmail: detail.tenant_email,
        tenantName: detail.tenant_full_name,
        uploadUrl: detail.secure_upload_url,
      }).catch(() => undefined);
    }

    revalidateCasePaths(checkId);
    return { success: "Missing document categories were added to this check and the tenant was notified." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not request missing documents." };
  }
}

export async function rejectDocumentAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const access = await resolveCaseAccess(checkId, true);
    const parsed = parseFormSchema(rejectDocumentSchema, {
      documentId: formEntry(formData.get("document_id")),
      reason: formEntry(formData.get("reason")),
    });

    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    if (access.demo) {
      return { success: "Document marked for resubmission in the presentation case." };
    }

    const admin = createAdminClient();
    const { data: document, error: documentError } = await admin
      .from("tenant_documents")
      .select("id, document_type, file_name, tenant_check_id")
      .eq("id", parsed.data.documentId)
      .eq("tenant_check_id", checkId)
      .maybeSingle();

    if (documentError || !document) {
      return { error: "This document could not be found." };
    }

    const { error: rejectError } = await admin
      .from("tenant_documents")
      .update({
        rejection_reason: parsed.data.reason,
        rejected_at: new Date().toISOString(),
        rejected_by: access.profileId,
        upload_status: "rejected",
      })
      .eq("id", document.id);

    if (rejectError) {
      return { error: rejectError.message };
    }

    const detail = await getAdminCheckDetail(checkId);
    if (detail) {
      const complete = isRequiredDocumentSubmissionComplete(
        detail.requested_documents,
        detail.tenant_documents,
      );

      if (!complete && detail.status !== "pending_upload" && detail.status !== "draft") {
        await admin
          .from("tenant_checks")
          .update({
            review_completed_at: null,
            status: "pending_upload",
          })
          .eq("id", checkId);
      }

      await insertReviewerNote({
        authorId: access.profileId,
        authorRole: "admin",
        body: `Rejected ${document.document_type} (${document.file_name}) for resubmission: ${parsed.data.reason}`,
        checkId,
      }).catch(() => undefined);

      if (detail.tenant_email && detail.secure_upload_url) {
        await notifyTenantDocumentRejected({
          documentLabel: getCatalogDocumentLabel(document.document_type),
          propertyName: detail.properties?.name ?? "Property",
          reason: parsed.data.reason,
          tenantEmail: detail.tenant_email,
          tenantName: detail.tenant_full_name,
          uploadUrl: detail.secure_upload_url,
        }).catch(() => undefined);
      }
    }

    revalidateCasePaths(checkId);
    return { success: "Document rejected. The tenant can resubmit through their secure upload link." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reject this document." };
  }
}

export async function addReviewerNoteAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const asAdmin = formData.get("as_admin") === "on";
    const access = await resolveCaseAccess(checkId, asAdmin);
    const parsed = parseFormSchema(reviewerNoteSchema, {
      body: formEntry(formData.get("body")),
    });

    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    if (access.demo) {
      return { success: "Reviewer note saved for the presentation case." };
    }

    await insertReviewerNote({
      authorId: access.profileId,
      authorRole: access.authorRole,
      body: parsed.data.body,
      checkId,
    });

    revalidateCasePaths(checkId);
    return { success: "Reviewer note saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save reviewer note." };
  }
}

export async function recordLandlordDecisionAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const access = await resolveCaseAccess(checkId, false);
    const parsed = parseFormSchema(landlordDecisionSchema, {
      decision: formEntry(formData.get("decision")) as "approved" | "declined" | "conditional",
      notes: formEntry(formData.get("notes")) || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    if (access.demo) {
      return { success: "Landlord decision recorded for the presentation case." };
    }

    const detail = await getLandlordCheckDetail(checkId);
    if (!detail) {
      return { error: "This tenant check could not be found." };
    }

    if (detail.status !== "report_ready") {
      return { error: "Landlord decisions can be recorded after the SafeKey Report is ready." };
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("tenant_checks")
      .update({
        landlord_decided_at: new Date().toISOString(),
        landlord_decision: parsed.data.decision,
        landlord_decision_notes: parsed.data.notes ?? null,
      })
      .eq("id", checkId);

    if (updateError) {
      return { error: updateError.message };
    }

    await insertReviewerNote({
      authorId: access.profileId,
      authorRole: "landlord",
      body: `Landlord decision: ${parsed.data.decision}${parsed.data.notes ? `. ${parsed.data.notes}` : ""}`,
      checkId,
    }).catch(() => undefined);

    revalidateCasePaths(checkId);
    return { success: "Your rental decision was recorded." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record landlord decision." };
  }
}
