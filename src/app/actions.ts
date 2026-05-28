"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { generateTenantRiskReport } from "@/lib/ai";
import { requireAdmin, requireLandlord } from "@/lib/auth";
import {
  getBillingEligibilityForCheck,
  getBillingOverviewForUser,
  isBillingSchemaReady,
} from "@/lib/billing-queries";
import { resolveAuthRedirectPath } from "@/lib/billing-navigation";
import { isDemoUploadToken } from "@/lib/demo-data";
import { notifyTenantUploadInvitation } from "@/lib/notifications";
import { sanitizeInternalPath } from "@/lib/safe-redirect";
import { getBillingPlanLimits, isEntitledSubscriptionStatus, type BillingPlanKey } from "@/lib/billing";
import type { InsuranceEligibilityStatus } from "@/lib/database.types";
import {
  buildStoragePath,
  extractTextFromUpload,
  getUploadMimeType,
  validateUploadFiles,
} from "@/lib/documents";
import {
  env,
  getSupabaseBrowserEnvIssue,
  hasStripeServerEnv,
  hasSupabaseServiceEnv,
} from "@/lib/env";
import type { TenantCheckDetail } from "@/lib/queries";
import { getAdminCheckDetail, getLandlordCheckDetail, getPublicCheckByToken } from "@/lib/queries";
import { buildProtectionAssessment, getFallbackProtectionPackages } from "@/lib/protection";
import { createSecureToken, hashToken } from "@/lib/security";
import {
  createBillingPortalSession,
  createScreeningCheckoutSession,
  getOrCreateStripeCustomer,
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
};

type AdminCheckDetail = TenantCheckDetail;

const DEFAULT_REQUESTED_DOCUMENTS = [
  "government_id",
  "proof_of_income",
  "employment_letter",
  "bank_statement",
];

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const signUpSchema = z.object({
  companyName: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email address."),
  fullName: z.string().trim().min(2, "Full name is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const createCheckSchema = z.object({
  propertyName: z.string().trim().min(2, "Property name is required."),
  addressLine1: z.string().trim().min(6, "Property address is required."),
  city: z.string().trim().min(2, "City is required."),
  postalCode: z.string().trim().optional(),
  monthlyRent: z.coerce.number().positive("Monthly rent must be positive."),
  tenantFullName: z.string().trim().min(2, "Tenant full name is required."),
  tenantEmail: z
    .string()
    .trim()
    .email("Enter a valid tenant email.")
    .optional()
    .or(z.literal("")),
  tenantPhone: z.string().trim().optional(),
});

const uploadProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.string().trim().email("A valid email is required."),
  phone: z.string().trim().min(6, "Phone number is required."),
  currentAddress: z.string().trim().min(8, "Current address is required."),
  employmentStatus: z.string().trim().min(2, "Employment status is required."),
  employerName: z.string().trim().optional(),
  monthlyIncome: z.coerce.number().positive("Monthly income must be positive."),
  notes: z.string().trim().optional(),
  moveInDate: z.string().trim().optional(),
  documentType: z.string().trim().min(2, "Document category is required."),
  documentNotes: z.string().trim().optional(),
  consentConfirmed: z.boolean().refine((value) => value, {
    message: "Consent must be confirmed before upload.",
  }),
});

const protectionReviewSchema = z.object({
  manualOverrideNote: z.string().trim().max(1000).optional(),
  status: z.enum([
    "eligible",
    "conditionally_eligible",
    "not_eligible",
    "pending_more_documents",
  ]),
});

export async function signInAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Please check your credentials." };
    }

    const email = parsed.data.email.toLowerCase();
    const envIssue = getSupabaseBrowserEnvIssue();

    if (envIssue) {
      return { error: envIssue };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    const nextValue = formData.get("next");
    redirect(sanitizeInternalPath(typeof nextValue === "string" ? nextValue : null));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const normalizedError = formatAuthActionError(error, "sign in");
    return { error: normalizedError.userMessage };
  }
}

export async function signUpAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = signUpSchema.safeParse({
      companyName: formData.get("company_name"),
      email: formData.get("email"),
      fullName: formData.get("full_name"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Please check the form fields." };
    }

    const email = parsed.data.email.toLowerCase();
    const envIssue = getSupabaseBrowserEnvIssue();

    if (envIssue) {
      return { error: envIssue };
    }

    const supabase = await createClient();
    const nextPath = resolveAuthRedirectPath(formData.get("next"), formData.get("plan"));
    const callbackUrl = new URL("/auth/callback", env.appUrl);
    callbackUrl.searchParams.set("next", nextPath);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        data: {
          full_name: parsed.data.fullName,
          company_name: normalizeOptionalString(parsed.data.companyName),
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (!signInResult.error) {
      revalidatePath("/", "layout");
      redirect(nextPath);
    }

    return {
      success: getPostSignupMessage(signInResult.error.message),
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const normalizedError = formatAuthActionError(error, "sign up");
    return { error: normalizedError.userMessage };
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function startSubscriptionCheckoutAction(
  planKey: BillingPlanKey,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  console.info("[safekey-checkout] action:startSubscriptionCheckoutAction", { planKey });

  try {
    const { startSubscriptionCheckoutForUser } = await import("@/lib/billing-checkout");
    const result = await startSubscriptionCheckoutForUser(planKey, "action");

    if (!result.ok) {
      return {
        error: result.detail ? `${result.error} (${result.detail})` : result.error,
      };
    }

    redirect(result.url);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const { formatStripeError } = await import("@/lib/stripe-errors");
    const formatted = formatStripeError(error);
    console.error("[safekey-checkout] action:unexpected", formatted);

    return {
      error: formatted.detail ? `${formatted.message} (${formatted.detail})` : formatted.message,
    };
  }
}

export async function openBillingPortalAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    if (!hasStripeServerEnv()) {
      return { error: "Billing is not configured yet. Add the Stripe server keys before enabling portal access." };
    }

    if (!(await isBillingSchemaReady({ admin: true }))) {
      return {
        error: "Billing database tables are not deployed yet. Apply the latest Supabase billing migrations.",
      };
    }

    const { profile } = await requireLandlord();
    const overview = await getBillingOverviewForUser(profile.id, { admin: true });
    const customer = overview.customer;

    if (!customer) {
      return {
        error: "No billing account exists yet. Choose a plan or purchase a screening first.",
      };
    }

    const portalSession = await createBillingPortalSession({
      customerId: customer.stripe_customer_id,
    });
    redirect(portalSession.url);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "The billing portal could not be opened.",
    };
  }
}

export async function startScreeningCheckoutAction(
  checkId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    if (!hasStripeServerEnv()) {
      return { error: "Billing is not configured yet. Add the Stripe server keys before enabling checkout." };
    }

    if (!(await isBillingSchemaReady({ admin: true }))) {
      return {
        error: "Billing database tables are not deployed yet. Apply the latest Supabase billing migrations.",
      };
    }

    const { profile } = await requireLandlord();
    const detail = await getLandlordCheckDetail(checkId);

    if (!detail) {
      return { error: "This tenant case no longer exists." };
    }

    const eligibility = await getBillingEligibilityForCheck({
      checkId,
      landlordId: profile.id,
      useAdmin: true,
    });

    if (eligibility.activeSubscription && isEntitledSubscriptionStatus(eligibility.activeSubscription.status)) {
      return {
        success: "Your active plan already covers this tenant screening.",
      };
    }

    if (eligibility.screeningPayment?.status === "paid") {
      return {
        success: "This tenant screening payment has already been completed.",
      };
    }

    const customer = eligibility.customer ?? (await getOrCreateStripeCustomer(profile));
    const session = await createScreeningCheckoutSession({
      checkId,
      customerId: customer.stripe_customer_id,
      userId: profile.id,
    });

    const admin = createAdminClient();
    await admin.from("billing_checkout_sessions").upsert(
      {
        amount_total: session.amount_total,
        cancel_url: session.cancel_url,
        completed_at: null,
        currency: session.currency,
        mode: "payment",
        payment_status: session.payment_status,
        plan_key: null,
        status: "open",
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customer.stripe_customer_id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        stripe_subscription_id: null,
        success_url: session.success_url,
        tenant_check_id: checkId,
        user_id: profile.id,
      },
      { onConflict: "stripe_checkout_session_id" },
    );
    await admin.from("screening_payments").upsert(
      {
        amount_total: session.amount_total,
        currency: session.currency ?? "eur",
        status: "pending",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        tenant_check_id: checkId,
        user_id: profile.id,
      },
      { onConflict: "tenant_check_id" },
    );

    if (!session.url) {
      return { error: "Stripe checkout could not be created for this screening." };
    }

    redirect(session.url);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "The screening checkout could not be started.",
    };
  }
}

export async function createTenantCheckAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profile } = await requireLandlord();
  const supabase = await createClient();
  const parsed = createCheckSchema.safeParse({
    propertyName: formData.get("property_name"),
    addressLine1: formData.get("address_line1"),
    city: formData.get("city"),
    postalCode: formData.get("postal_code"),
    monthlyRent: formData.get("monthly_rent"),
    tenantFullName: formData.get("tenant_full_name"),
    tenantEmail: formData.get("tenant_email"),
    tenantPhone: formData.get("tenant_phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const requestedDocuments = Array.from(
    new Set(
      formData
        .getAll("requested_documents")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  );

  const billingOverview = await getBillingOverviewForUser(profile.id);
  const planKey = (billingOverview.activeSubscription?.plan_key as BillingPlanKey | null) ?? null;
  const limits = getBillingPlanLimits(planKey);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ count: activeChecksCount, error: activeChecksError }, { data: completedRows, error: completedError }] =
    await Promise.all([
      supabase
        .from("tenant_checks")
        .select("id", { count: "exact", head: true })
        .neq("status", "report_ready"),
      supabase
        .from("tenant_checks")
        .select("review_completed_at, created_at")
        .eq("status", "report_ready")
        .gte("created_at", monthStart.toISOString()),
    ]);

  if (activeChecksError) {
    return { error: activeChecksError.message };
  }
  if (completedError) {
    return { error: completedError.message };
  }

  const completedThisMonth = (completedRows ?? []).filter((row) => {
    const completedAt = row.review_completed_at ?? row.created_at;
    return new Date(completedAt).getTime() >= monthStart.getTime();
  }).length;

  if ((activeChecksCount ?? 0) >= limits.activeChecks) {
    return {
      error: `Active case limit reached for your plan (${limits.activeChecks}). Upgrade plan to create more checks.`,
    };
  }

  if (completedThisMonth >= limits.completedChecksPerMonth) {
    return {
      error: `Monthly completed screening limit reached (${limits.completedChecksPerMonth}). Upgrade plan for higher volume.`,
    };
  }

  const token = createSecureToken();
  const tokenHash = hashToken(token);
  const uploadUrl = new URL(`/upload/${token}`, env.appUrl).toString();
  const { data: checkId, error: checkError } = await supabase.rpc("create_tenant_check", {
    p_address_line1: parsed.data.addressLine1,
    p_city: parsed.data.city,
    p_monthly_rent: parsed.data.monthlyRent,
    p_postal_code: normalizeOptionalString(parsed.data.postalCode),
    p_property_name: parsed.data.propertyName,
    p_requested_documents:
      requestedDocuments.length > 0 ? requestedDocuments : DEFAULT_REQUESTED_DOCUMENTS,
    p_secure_upload_url: uploadUrl,
    p_tenant_email: normalizeOptionalString(parsed.data.tenantEmail)?.toLowerCase() ?? null,
    p_tenant_full_name: parsed.data.tenantFullName,
    p_tenant_phone: normalizeOptionalString(parsed.data.tenantPhone),
    p_upload_token_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    p_upload_token_hash: tokenHash,
  });

  if (checkError) {
    return { error: checkError.message };
  }

  if (!checkId) {
    return { error: "The tenant verification request could not be created." };
  }

  const tenantEmail = normalizeOptionalString(parsed.data.tenantEmail)?.toLowerCase();

  if (tenantEmail) {
    await notifyTenantUploadInvitation({
      tenantEmail,
      tenantName: parsed.data.tenantFullName,
      uploadUrl,
      propertyName: parsed.data.propertyName,
    });
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/checks/${checkId}`);
}

export async function uploadDocumentsAction(
  token: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoUploadToken(token)) {
    return { error: "Sample upload links are read-only. Create a live screening from your dashboard." };
  }

  const parsed = uploadProfileSchema.safeParse({
    fullName: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    currentAddress: formData.get("current_address"),
    employmentStatus: formData.get("employment_status"),
    employerName: formData.get("employer_name"),
    monthlyIncome: formData.get("monthly_income"),
    notes: formData.get("notes"),
    moveInDate: formData.get("move_in_date"),
    documentType: formData.get("document_type"),
    documentNotes: formData.get("document_notes"),
    consentConfirmed: formData.get("consent_confirmed") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please complete the upload form." };
  }

  const files = formData
    .getAll("documents")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const fileValidationError = validateUploadFiles(files);

  if (fileValidationError) {
    return { error: fileValidationError };
  }

  if (!hasSupabaseServiceEnv()) {
    return {
      error:
        "Secure uploads are not configured yet. Add SUPABASE_SERVICE_ROLE_KEY before accepting tenant files.",
    };
  }

  const check = await getPublicCheckByToken(token);

  if (!check) {
    return { error: "This upload link is invalid or has expired." };
  }

  if (check.status === "report_ready") {
    return {
      error:
        "This verification case is already complete. Contact the landlord if you need to submit additional documents.",
    };
  }

  const admin = createAdminClient();
  const uploadedStoragePaths: string[] = [];
  const createdDocumentIds: string[] = [];

  try {
    const { error: profileError } = await admin.from("tenant_public_profiles").upsert(
      {
        consent_confirmed: true,
        current_address: parsed.data.currentAddress,
        email: parsed.data.email.toLowerCase(),
        employer_name: normalizeOptionalString(parsed.data.employerName),
        employment_status: parsed.data.employmentStatus,
        full_name: parsed.data.fullName,
        monthly_income: parsed.data.monthlyIncome,
        monthly_rent: check.properties?.monthly_rent ?? null,
        move_in_date: normalizeOptionalString(parsed.data.moveInDate),
        notes: normalizeOptionalString(parsed.data.notes),
        phone: parsed.data.phone,
        tenant_check_id: check.id,
      },
      { onConflict: "tenant_check_id" },
    );

    if (profileError) {
      return { error: profileError.message };
    }

    for (const file of files) {
      const mimeType = getUploadMimeType(file);
      const storagePath = buildStoragePath(check.id, parsed.data.documentType, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const extraction = await extractTextFromUpload(file, {
        documentType: parsed.data.documentType,
        notes: parsed.data.documentNotes,
      });

      const { error: storageError } = await admin.storage
        .from("tenant-documents")
        .upload(storagePath, buffer, {
          cacheControl: "3600",
          contentType: mimeType,
          upsert: false,
        });

      if (storageError) {
        throw new Error(`Could not upload ${file.name}. ${storageError.message}`);
      }

      uploadedStoragePaths.push(storagePath);

      const { data: document, error: documentError } = await admin
        .from("tenant_documents")
        .insert({
          document_type: parsed.data.documentType,
          extracted_text: extraction,
          file_name: file.name,
          file_size: file.size,
          mime_type: mimeType,
          storage_path: storagePath,
          tenant_check_id: check.id,
          uploaded_by_email: parsed.data.email.toLowerCase(),
        })
        .select("id")
        .single();

      if (documentError) {
        throw new Error(`Could not save metadata for ${file.name}. ${documentError.message}`);
      }

      createdDocumentIds.push(document.id);
    }

    const { error: reportDeleteError } = await admin
      .from("ai_reports")
      .delete()
      .eq("tenant_check_id", check.id);

    if (reportDeleteError) {
      throw new Error(`Could not refresh the review pipeline. ${reportDeleteError.message}`);
    }

    await resetProtectionArtifacts(admin, check.id);

    const { error: checkUpdateError } = await admin
      .from("tenant_checks")
      .update({
        review_completed_at: null,
        review_requested_at: new Date().toISOString(),
        status: "documents_received",
      })
      .eq("id", check.id);

    if (checkUpdateError) {
      throw new Error(`Could not update the verification request. ${checkUpdateError.message}`);
    }

    revalidatePath(`/upload/${token}`);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/checks/${check.id}`);
    revalidatePath("/admin/review");
    revalidatePath(`/admin/review/${check.id}`);

    return {
      success:
        "Document batch uploaded successfully. You can submit more files from this link or leave the review team to continue the verification workflow.",
    };
  } catch (error) {
    await rollbackUploadedBatch(admin, createdDocumentIds, uploadedStoragePaths);

    return {
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading your documents. Please try again.",
    };
  }
}

export async function generateReportAction(
  checkId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const detail = await getAdminCheckDetail(checkId);

  if (!detail) {
    return { error: "This review case no longer exists." };
  }

  if (detail.tenant_documents.length === 0) {
    return { error: "At least one uploaded document is required before generating a report." };
  }

  const billingEligibility = await getBillingEligibilityForCheck({
    checkId: detail.id,
    landlordId: detail.landlord_id,
    useAdmin: true,
  });

  if (!billingEligibility.hasBillingAccess) {
    return {
      error:
        "This case requires an active subscription or a completed one-time screening payment before a report can be generated.",
    };
  }

  const { error: reviewStartError } = await supabase
    .from("tenant_checks")
    .update({
      review_requested_at: detail.review_requested_at ?? new Date().toISOString(),
      status: "under_review",
    })
    .eq("id", detail.id);

  if (reviewStartError) {
    return { error: reviewStartError.message };
  }

  try {
    const report = await generateTenantRiskReport({
      checkId: detail.id,
      documents: detail.tenant_documents.map((document) => ({
        documentType: document.document_type,
        extractedText: document.extracted_text,
        fileName: document.file_name,
      })),
      propertyMonthlyRent: detail.properties?.monthly_rent ?? null,
      requestedDocuments: detail.requested_documents,
      tenantFullName: detail.tenant_full_name,
      tenantProfile: detail.tenant_public_profiles
        ? {
            currentAddress: detail.tenant_public_profiles.current_address,
            employerName: detail.tenant_public_profiles.employer_name,
            employmentStatus: detail.tenant_public_profiles.employment_status,
            monthlyIncome: detail.tenant_public_profiles.monthly_income,
            notes: detail.tenant_public_profiles.notes,
          }
        : null,
    });

    const { error: reportError } = await supabase.from("ai_reports").upsert(
      {
        generated_by: report.generatedBy,
        missing_documents: report.missingDocuments,
        recommendation: report.recommendation,
        reasoning: report.reasoning,
        red_flags: report.redFlags,
        score: report.score,
        strengths: report.strengths,
        summary: report.summary,
        tenant_check_id: detail.id,
      },
      { onConflict: "tenant_check_id" },
    );

    if (reportError) {
      throw new Error(reportError.message);
    }

    try {
      await syncProtectionArtifacts(detail.id, report, {
        documents: detail.tenant_documents,
        landlordId: detail.landlord_id,
        propertyMonthlyRent: detail.properties?.monthly_rent ?? null,
        requestedDocuments: detail.requested_documents,
        tenantId: detail.tenant_public_profiles?.id ?? null,
        tenantProfile: detail.tenant_public_profiles,
      });
    } catch (error) {
      if (!isProtectionSchemaMissingError(error)) {
        throw error;
      }
    }

    const { error: completeError } = await supabase
      .from("tenant_checks")
      .update({
        review_completed_at: new Date().toISOString(),
        review_requested_at: detail.review_requested_at ?? new Date().toISOString(),
        status: "report_ready",
      })
      .eq("id", detail.id);

    if (completeError) {
      throw new Error(completeError.message);
    }

    revalidatePath("/admin/review");
    revalidatePath(`/admin/review/${detail.id}`);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/checks/${detail.id}`);
    redirect(`/admin/review/${detail.id}`);
  } catch (error) {
    await supabase
      .from("tenant_checks")
      .update({
        status: "documents_received",
      })
      .eq("id", detail.id);

    return {
      error:
        error instanceof Error
          ? error.message
          : "The report could not be generated. Please try again.",
    };
  }
}

export async function updateProtectionReviewAction(
  checkId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = protectionReviewSchema.safeParse({
    manualOverrideNote: formData.get("manual_override_note"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Select a protection review outcome." };
  }

  const detail = await getAdminCheckDetail(checkId);

  if (!detail || !detail.ai_reports) {
    return { error: "Generate the tenant risk report before setting protection eligibility." };
  }

  try {
    await syncProtectionArtifacts(checkId, detail.ai_reports, {
      documents: detail.tenant_documents,
      landlordId: detail.landlord_id,
      manualOverrideNote: normalizeOptionalString(parsed.data.manualOverrideNote),
      overrideStatus: parsed.data.status,
      propertyMonthlyRent: detail.properties?.monthly_rent ?? null,
      requestedDocuments: detail.requested_documents,
      reviewSource: "admin_override",
      tenantId: detail.tenant_public_profiles?.id ?? null,
      tenantProfile: detail.tenant_public_profiles,
    });
  } catch (error) {
    if (isProtectionSchemaMissingError(error)) {
      return {
        error:
          "Apply the latest protection migration before saving admin protection reviews.",
      };
    }

    return {
      error: error instanceof Error ? error.message : "The protection review could not be updated.",
    };
  }

  revalidatePath("/admin/review");
  revalidatePath(`/admin/review/${checkId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/checks/${checkId}`);

  return {
    success: `Protection review updated to ${parsed.data.status.replaceAll("_", " ")}.`,
  };
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = requestPasswordResetSchema.safeParse({
      email: formData.get("email"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
    }

    const envIssue = getSupabaseBrowserEnvIssue();

    if (envIssue) {
      return { error: envIssue };
    }

    const supabase = await createClient();
    const callbackUrl = new URL("/auth/callback", env.appUrl);
    callbackUrl.searchParams.set("next", "/login/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
      redirectTo: callbackUrl.toString(),
    });

    if (error) {
      return { error: error.message };
    }

    return {
      success:
        "If an account exists for that email, we sent password reset instructions. Check your inbox and spam folder.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not send the password reset email.",
    };
  }
}

export async function updatePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = updatePasswordSchema.safeParse({
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Check your new password." };
    }

    const envIssue = getSupabaseBrowserEnvIssue();

    if (envIssue) {
      return { error: envIssue };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Your reset session expired. Request a new password reset link." };
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "Could not update your password.",
    };
  }
}

function formatAuthActionError(error: unknown, action: "sign in" | "sign up") {
  const message = error instanceof Error ? error.message : "Unknown error";

  return {
    logData: { action, message },
    userMessage: message,
  };
}

function getPostSignupMessage(signInMessage: string) {
  const normalized = signInMessage.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Account created. Check your email to confirm your account, then sign in.";
  }

  return "Account created successfully. Sign in to continue.";
}

async function syncProtectionArtifacts(
  checkId: string,
  report:
    | Awaited<ReturnType<typeof generateTenantRiskReport>>
    | NonNullable<AdminCheckDetail["ai_reports"]>,
  context: {
    documents: Array<{ document_type: string }>;
    landlordId: string;
    manualOverrideNote?: string | null;
    overrideStatus?: InsuranceEligibilityStatus;
    propertyMonthlyRent: number | null;
    requestedDocuments: string[];
    reviewSource?: "system" | "admin_override";
    tenantId: string | null;
    tenantProfile: AdminCheckDetail["tenant_public_profiles"];
  },
) {
  const admin = createAdminClient();
  const assessment = buildProtectionAssessment(
    {
      aiReport: {
        created_at: "created_at" in report ? report.created_at : new Date().toISOString(),
        generated_by: "generatedBy" in report ? report.generatedBy : report.generated_by,
        id: "id" in report ? report.id : crypto.randomUUID(),
        missing_documents: "missingDocuments" in report ? report.missingDocuments : report.missing_documents,
        recommendation: report.recommendation,
        reasoning: report.reasoning,
        red_flags: "redFlags" in report ? report.redFlags : report.red_flags,
        score: report.score,
        strengths: report.strengths,
        summary: report.summary,
        tenant_check_id: checkId,
        updated_at: new Date().toISOString(),
      },
      documents: context.documents,
      propertyMonthlyRent: context.propertyMonthlyRent,
      requestedDocuments: context.requestedDocuments,
      tenantProfile: context.tenantProfile,
    },
    {
      manualOverrideNote: context.manualOverrideNote,
      overrideStatus: context.overrideStatus,
    },
  );

  if (!assessment) {
    return;
  }

  const packages = getFallbackProtectionPackages();
  const { data: packageRecords, error: packageUpsertError } = await admin
    .from("protection_packages")
    .upsert(
      packages.map((item) => ({
        coverage_items: item.coverage_items,
        description: item.description,
        estimated_price: item.estimated_price,
        is_active: true,
        name: item.name,
        type: item.type,
      })),
      { onConflict: "name" },
    )
    .select("*");

  if (packageUpsertError) {
    throw new Error(packageUpsertError.message);
  }

  const packageIdByName = new Map((packageRecords ?? []).map((item) => [item.name, item.id]));

  const { error: eligibilityError } = await admin.from("insurance_eligibility").upsert(
    {
      eligibility_reason: assessment.eligibilityReason,
      manual_override_note: context.manualOverrideNote ?? null,
      missing_requirements: assessment.missingRequirements,
      recommended_package: assessment.recommendedPackage,
      review_source: context.reviewSource ?? "system",
      risk_score: assessment.riskScore,
      status: assessment.status,
      tenant_check_id: checkId,
    },
    { onConflict: "tenant_check_id" },
  );

  if (eligibilityError) {
    throw new Error(eligibilityError.message);
  }

  const { error: deleteOptionsError } = await admin
    .from("tenant_check_protection_options")
    .delete()
    .eq("tenant_check_id", checkId);

  if (deleteOptionsError) {
    throw new Error(deleteOptionsError.message);
  }

  const optionRows = assessment.packageOptions
    .map((option) => {
      const packageId = packageIdByName.get(option.name);

      if (!packageId) {
        return null;
      }

      return {
        eligibility_status: option.eligibilityStatus,
        package_id: packageId,
        recommendation_reason: option.recommendationReason,
        tenant_check_id: checkId,
      };
    })
    .filter(
      (
        item,
      ): item is {
        eligibility_status: InsuranceEligibilityStatus;
        package_id: string;
        recommendation_reason: string;
        tenant_check_id: string;
      } => item !== null,
    );

  if (optionRows.length > 0) {
    const { error: insertOptionsError } = await admin
      .from("tenant_check_protection_options")
      .insert(optionRows);

    if (insertOptionsError) {
      throw new Error(insertOptionsError.message);
    }
  }

  const { error: deleteQuotesError } = await admin
    .from("deposit_protection_quotes")
    .delete()
    .eq("tenant_check_id", checkId);

  if (deleteQuotesError) {
    throw new Error(deleteQuotesError.message);
  }

  if (assessment.depositQuote) {
    const { error: insertQuoteError } = await admin.from("deposit_protection_quotes").insert({
      coverage_amount: assessment.depositQuote.coverageAmount,
      landlord_id: context.landlordId,
      proposed_protection_fee: assessment.depositQuote.proposedProtectionFee,
      rent_amount: assessment.depositQuote.rentAmount,
      status: assessment.depositQuote.status,
      tenant_check_id: checkId,
      tenant_id: context.tenantId,
      traditional_deposit_amount: assessment.depositQuote.traditionalDepositAmount,
    });

    if (insertQuoteError) {
      throw new Error(insertQuoteError.message);
    }
  }
}

async function resetProtectionArtifacts(admin: ReturnType<typeof createAdminClient>, checkId: string) {
  const deletions = await Promise.all([
    admin.from("tenant_check_protection_options").delete().eq("tenant_check_id", checkId),
    admin.from("deposit_protection_quotes").delete().eq("tenant_check_id", checkId),
    admin.from("insurance_eligibility").delete().eq("tenant_check_id", checkId),
  ]);

  for (const result of deletions) {
    if (result.error && !isProtectionSchemaMissingError(result.error)) {
      throw new Error(result.error.message);
    }
  }
}

function isProtectionSchemaMissingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /insurance_eligibility|protection_packages|tenant_check_protection_options|deposit_protection_quotes/i.test(
    message,
  );
}

async function rollbackUploadedBatch(
  admin: ReturnType<typeof createAdminClient>,
  createdDocumentIds: string[],
  uploadedStoragePaths: string[],
) {
  if (createdDocumentIds.length > 0) {
    await admin.from("tenant_documents").delete().in("id", createdDocumentIds);
  }

  if (uploadedStoragePaths.length > 0) {
    await admin.storage.from("tenant-documents").remove(uploadedStoragePaths);
  }
}
