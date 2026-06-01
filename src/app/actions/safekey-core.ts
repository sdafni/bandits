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
import {
  dedupeDocumentRequirements,
  getCatalogDocumentLabel,
  getDefaultDocumentRequirementPriority,
  isDocumentPlanSubmissionComplete,
  type DocumentPriority,
} from "@/lib/safekey-document-catalog";
import {
  isDocumentPriority,
  resolveCheckDocumentPlan,
  persistCheckDocumentRequirements,
} from "@/lib/safekey-document-plan";
import { createAdminClient } from "@/lib/supabase/admin";

const requestMissingSchema = z.object({
  documentTypes: z.array(z.string().trim().min(1)).min(1, "Select at least one document category."),
  message: z.string().trim().max(1000).optional(),
});

const reviewDocumentSchema = z.object({
  documentId: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
  reviewStatus: z.enum(["accepted", "rejected", "needs_replacement", "not_requested"]),
});

const waiveRequirementSchema = z.object({
  documentType: z.string().trim().min(1),
  waived: z.preprocess((value) => value === "on" || value === true || value === "true", z.boolean()),
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

function parseDocumentRequirementsFromForm(formData: FormData) {
  const documentTypes = formData.getAll("document_types").map((value) => String(value));
  const priorities: Record<string, DocumentPriority> = {};

  for (const documentType of documentTypes) {
    const priorityValue = formEntry(formData.get(`priority_${documentType}`));
    priorities[documentType] = isDocumentPriority(priorityValue)
      ? priorityValue
      : getDefaultDocumentRequirementPriority(documentType);
  }

  return dedupeDocumentRequirements(
    documentTypes.map((documentType) => ({
      documentType,
      priority: priorities[documentType] ?? getDefaultDocumentRequirementPriority(documentType),
    })),
  );
}

function shouldReopenUploadAfterRequirementChange(params: {
  addedDocumentTypes: string[];
  detail: NonNullable<Awaited<ReturnType<typeof getLandlordCheckDetail>>>;
  nextRequirements: ReturnType<typeof dedupeDocumentRequirements>;
  previousPlan: ReturnType<typeof resolveCheckDocumentPlan>;
}) {
  if (params.detail.status === "draft") {
    return false;
  }

  if (["documents_received", "under_review", "report_ready"].includes(params.detail.status)) {
    return true;
  }

  if (params.addedDocumentTypes.length > 0) {
    return true;
  }

  const priorityUpgraded = params.nextRequirements.some((requirement) => {
    const previous = params.previousPlan.requirements.find(
      (item) => item.documentType === requirement.documentType,
    );
    return (
      requirement.priority === "required" &&
      previous?.priority !== "required" &&
      !isDocumentPlanSubmissionComplete([requirement], params.detail.tenant_documents)
    );
  });

  return priorityUpgraded;
}

async function persistDocumentRequirements(params: {
  access: CaseAccess;
  asAdmin: boolean;
  checkId: string;
  message?: string;
  nextRequirements: ReturnType<typeof dedupeDocumentRequirements>;
}) {
  const detail = params.asAdmin
    ? await getAdminCheckDetail(params.checkId)
    : await getLandlordCheckDetail(params.checkId);

  if (!detail) {
    return { error: "This tenant check could not be found." } satisfies ActionState;
  }

  const previousPlan = resolveCheckDocumentPlan(detail);
  const previousTypes = new Set(previousPlan.requestedDocuments);
  const nextTypes = new Set(params.nextRequirements.map((requirement) => requirement.documentType));
  const addedDocumentTypes = [...nextTypes].filter((documentType) => !previousTypes.has(documentType));
  const removedDocumentTypes = [...previousTypes].filter((documentType) => !nextTypes.has(documentType));
  const reopenUpload = shouldReopenUploadAfterRequirementChange({
    addedDocumentTypes,
    detail,
    nextRequirements: params.nextRequirements,
    previousPlan,
  });
  const nextStatus =
    reopenUpload && detail.status !== "pending_upload" && detail.status !== "draft"
      ? "pending_upload"
      : detail.status;

  const admin = createAdminClient();
  const { error: updateError } = await persistCheckDocumentRequirements(
    admin,
    params.checkId,
    params.nextRequirements,
    {
      review_completed_at: reopenUpload ? null : detail.review_completed_at,
      status: nextStatus,
    },
  );

  if (updateError) {
    return { error: updateError.message } satisfies ActionState;
  }

  const changeSummary = [
    addedDocumentTypes.length > 0 ? `Added: ${addedDocumentTypes.join(", ")}` : null,
    removedDocumentTypes.length > 0 ? `Removed: ${removedDocumentTypes.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  const noteBody = params.message
    ? `Updated requested documents. ${changeSummary} ${params.message}`.trim()
    : `Updated requested documents.${changeSummary ? ` ${changeSummary}.` : ""}`;

  await insertReviewerNote({
    authorId: params.access.profileId,
    authorRole: params.access.authorRole,
    body: noteBody,
    checkId: params.checkId,
  }).catch(() => undefined);

  if (addedDocumentTypes.length > 0 && detail.tenant_email && detail.secure_upload_url) {
    await notifyTenantMissingDocumentsRequested({
      documentLabels: addedDocumentTypes.map(getCatalogDocumentLabel),
      message: params.message,
      propertyName: detail.properties?.name ?? "Property",
      tenantEmail: detail.tenant_email,
      tenantName: detail.tenant_full_name,
      uploadUrl: detail.secure_upload_url,
    }).catch(() => undefined);
  }

  revalidateCasePaths(params.checkId);

  return {
    success: reopenUpload
      ? "Document requirements updated and the tenant upload link was reopened."
      : "Document requirements updated for this check.",
  } satisfies ActionState;
}

export async function updateDocumentRequirementsAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const asAdmin = formData.get("as_admin") === "on";
    const access = await resolveCaseAccess(checkId, asAdmin);
    const nextRequirements = parseDocumentRequirementsFromForm(formData);

    if (nextRequirements.length === 0) {
      return { error: "Select at least one document category." };
    }

    if (access.demo) {
      return { success: "Document requirements updated for the presentation case." };
    }

    return await persistDocumentRequirements({
      access,
      asAdmin,
      checkId,
      message: formEntry(formData.get("message")) || undefined,
      nextRequirements,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update document requirements." };
  }
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

    const previousPlan = resolveCheckDocumentPlan(detail);
    const mergedRequirements = dedupeDocumentRequirements([
      ...previousPlan.requirements,
      ...parsed.data.documentTypes.map((documentType) => ({
        documentType,
        priority: getDefaultDocumentRequirementPriority(documentType),
      })),
    ]);

    return await persistDocumentRequirements({
      access,
      asAdmin,
      checkId,
      message: parsed.data.message,
      nextRequirements: mergedRequirements,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not request missing documents." };
  }
}

export async function reviewDocumentAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const asAdmin = formData.get("as_admin") === "on";
    const access = await resolveCaseAccess(checkId, asAdmin);
    const parsed = parseFormSchema(reviewDocumentSchema, {
      documentId: formEntry(formData.get("document_id")),
      note: formEntry(formData.get("note")) || undefined,
      reviewStatus: formEntry(formData.get("review_status")) as
        | "accepted"
        | "rejected"
        | "needs_replacement"
        | "not_requested",
    });

    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    if (
      (parsed.data.reviewStatus === "rejected" || parsed.data.reviewStatus === "needs_replacement") &&
      !parsed.data.note?.trim()
    ) {
      return { error: "Add a short note so the tenant knows what to fix." };
    }

    if (access.demo) {
      return { success: "Document review saved for the presentation case." };
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

    const note = parsed.data.note?.trim() || null;
    const needsResubmission =
      parsed.data.reviewStatus === "rejected" || parsed.data.reviewStatus === "needs_replacement";

    const { error: reviewError } = await admin
      .from("tenant_documents")
      .update({
        rejection_reason: note,
        review_note: note,
        rejected_at: needsResubmission ? new Date().toISOString() : null,
        rejected_by: needsResubmission ? access.profileId : null,
        upload_status: parsed.data.reviewStatus,
      })
      .eq("id", document.id);

    if (reviewError) {
      return { error: reviewError.message };
    }

    const detail = asAdmin ? await getAdminCheckDetail(checkId) : await getLandlordCheckDetail(checkId);
    if (detail) {
      const statusLabel = parsed.data.reviewStatus.replaceAll("_", " ");
      await insertReviewerNote({
        authorId: access.profileId,
        authorRole: access.authorRole,
        body: `Marked ${getCatalogDocumentLabel(document.document_type)} (${document.file_name}) as ${statusLabel}.${note ? ` ${note}` : ""}`,
        checkId,
      }).catch(() => undefined);

      if (
        (parsed.data.reviewStatus === "rejected" || parsed.data.reviewStatus === "needs_replacement") &&
        detail.tenant_email &&
        detail.secure_upload_url &&
        note
      ) {
        await notifyTenantDocumentRejected({
          documentLabel: getCatalogDocumentLabel(document.document_type),
          propertyName: detail.properties?.name ?? "Property",
          reason: note,
          tenantEmail: detail.tenant_email,
          tenantName: detail.tenant_full_name,
          uploadUrl: detail.secure_upload_url,
        }).catch(() => undefined);
      }
    }

    revalidateCasePaths(checkId);
    return { success: "Document review saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save document review." };
  }
}

/** @deprecated Use reviewDocumentAction */
export async function rejectDocumentAction(
  checkId: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  formData.set("review_status", "needs_replacement");
  if (!formData.get("note") && formData.get("reason")) {
    formData.set("note", String(formData.get("reason")));
  }

  return reviewDocumentAction(checkId, prevState, formData);
}

export async function waiveDocumentRequirementAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const asAdmin = formData.get("as_admin") === "on";
    const access = await resolveCaseAccess(checkId, asAdmin);
    const parsed = parseFormSchema(waiveRequirementSchema, {
      documentType: formEntry(formData.get("document_type")),
      waived: formData.get("waived") === "on",
    });

    if (!parsed.success) {
      return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    if (access.demo) {
      return { success: "Requirement waiver saved for the presentation case." };
    }

    const detail = asAdmin ? await getAdminCheckDetail(checkId) : await getLandlordCheckDetail(checkId);
    if (!detail) {
      return { error: "This tenant check could not be found." };
    }

    const previousPlan = resolveCheckDocumentPlan(detail);
    const nextRequirements = dedupeDocumentRequirements(
      previousPlan.requirements.map((requirement) =>
        requirement.documentType === parsed.data.documentType
          ? { ...requirement, waived: parsed.data.waived }
          : requirement,
      ),
    );

    const admin = createAdminClient();
    const { error } = await persistCheckDocumentRequirements(admin, checkId, nextRequirements);

    if (error) {
      return { error: error.message };
    }

    await insertReviewerNote({
      authorId: access.profileId,
      authorRole: access.authorRole,
      body: parsed.data.waived
        ? `Waived required document: ${getCatalogDocumentLabel(parsed.data.documentType)}.`
        : `Removed waiver for ${getCatalogDocumentLabel(parsed.data.documentType)}.`,
      checkId,
    }).catch(() => undefined);

    revalidateCasePaths(checkId);
    return {
      success: parsed.data.waived
        ? "Required document waived for this check."
        : "Document waiver removed.",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update document waiver." };
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
      decision: formEntry(formData.get("decision")),
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
      return { error: "A landlord decision can only be recorded after the SafeKey report is ready." };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("tenant_checks")
      .update({
        landlord_decided_at: new Date().toISOString(),
        landlord_decision: parsed.data.decision,
        landlord_decision_notes: parsed.data.notes ?? null,
      })
      .eq("id", checkId);

    if (error) {
      return { error: error.message };
    }

    revalidateCasePaths(checkId);
    return { success: "Landlord decision recorded." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record landlord decision." };
  }
}
