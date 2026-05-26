import type { Database } from "@/lib/database.types";
import {
  getDemoAdminCheckDetail,
  getDemoProtectionSnapshot,
  getDemoPublicCheckByToken,
  getDemoLandlordCheckDetail,
  isDemoCheckId,
  isDemoUploadToken,
} from "@/lib/demo-data";
import { hashToken } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TenantCheckListItem = Database["public"]["Tables"]["tenant_checks"]["Row"] & {
  properties: Database["public"]["Tables"]["properties"]["Row"] | null;
  ai_reports: Pick<
    Database["public"]["Tables"]["ai_reports"]["Row"],
    "score" | "recommendation" | "summary" | "created_at"
  > | null;
  tenant_documents: Pick<Database["public"]["Tables"]["tenant_documents"]["Row"], "id">[];
};

export type TenantCheckDetail = Database["public"]["Tables"]["tenant_checks"]["Row"] & {
  properties: Database["public"]["Tables"]["properties"]["Row"] | null;
  tenant_documents: Database["public"]["Tables"]["tenant_documents"]["Row"][];
  tenant_public_profiles: Database["public"]["Tables"]["tenant_public_profiles"]["Row"] | null;
  ai_reports: Database["public"]["Tables"]["ai_reports"]["Row"] | null;
};

export type PublicCheckDetail = Omit<TenantCheckDetail, "ai_reports">;
export type ProtectionSnapshot = {
  depositQuote: Database["public"]["Tables"]["deposit_protection_quotes"]["Row"] | null;
  insuranceEligibility: Database["public"]["Tables"]["insurance_eligibility"]["Row"] | null;
  protectionOptions: Array<
    Database["public"]["Tables"]["tenant_check_protection_options"]["Row"] & {
      protection_packages: Database["public"]["Tables"]["protection_packages"]["Row"] | null;
    }
  >;
};

export async function getLandlordChecks(): Promise<TenantCheckListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_checks")
    .select(
      `
        *,
        properties (*),
        ai_reports (score, recommendation, summary, created_at),
        tenant_documents (id)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    ...item,
    ai_reports: Array.isArray(item.ai_reports) ? item.ai_reports[0] ?? null : item.ai_reports,
    properties: Array.isArray(item.properties) ? item.properties[0] ?? null : item.properties,
    tenant_documents: Array.isArray(item.tenant_documents) ? item.tenant_documents : [],
  })) as TenantCheckListItem[];
}

export async function getLandlordCheckDetail(checkId: string): Promise<TenantCheckDetail | null> {
  if (isDemoCheckId(checkId)) {
    return getDemoLandlordCheckDetail(checkId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_checks")
    .select(
      `
        *,
        properties (*),
        tenant_documents (*),
        tenant_public_profiles (*),
        ai_reports (*)
      `,
    )
    .eq("id", checkId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeDetail(data);
}

export async function getAdminChecks(): Promise<TenantCheckListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_checks")
    .select(
      `
        *,
        properties (*),
        ai_reports (score, recommendation, summary, created_at),
        tenant_documents (id)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    ...item,
    ai_reports: Array.isArray(item.ai_reports) ? item.ai_reports[0] ?? null : item.ai_reports,
    properties: Array.isArray(item.properties) ? item.properties[0] ?? null : item.properties,
    tenant_documents: Array.isArray(item.tenant_documents) ? item.tenant_documents : [],
  })) as TenantCheckListItem[];
}

export async function getAdminCheckDetail(checkId: string): Promise<TenantCheckDetail | null> {
  if (isDemoCheckId(checkId)) {
    return getDemoAdminCheckDetail(checkId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_checks")
    .select(
      `
        *,
        properties (*),
        tenant_documents (*),
        tenant_public_profiles (*),
        ai_reports (*)
      `,
    )
    .eq("id", checkId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeDetail(data);
}

export async function getPublicCheckByToken(token: string): Promise<PublicCheckDetail | null> {
  if (isDemoUploadToken(token)) {
    return getDemoPublicCheckByToken(token);
  }

  const admin = createAdminClient();
  const tokenHash = hashToken(token);
  const { data, error } = await admin
    .from("tenant_checks")
    .select(
      `
        *,
        properties (*),
        tenant_documents (*),
        tenant_public_profiles (*)
      `,
    )
    .eq("upload_token_hash", tokenHash)
    .gt("upload_token_expires_at", new Date().toISOString())
    .single();

  if (error) {
    return null;
  }

  const record = data as Record<string, unknown>;

  return {
    ...record,
    properties: Array.isArray(record.properties) ? record.properties[0] ?? null : record.properties,
    tenant_documents: Array.isArray(record.tenant_documents) ? record.tenant_documents : [],
    tenant_public_profiles: Array.isArray(record.tenant_public_profiles)
      ? record.tenant_public_profiles[0] ?? null
      : record.tenant_public_profiles,
  } as PublicCheckDetail;
}

export async function getProtectionSnapshot(checkId: string): Promise<ProtectionSnapshot | null> {
  if (isDemoCheckId(checkId)) {
    return getDemoProtectionSnapshot(checkId);
  }

  const supabase = await createClient();

  try {
    const [{ data: insuranceEligibility }, { data: protectionOptions }, { data: depositQuote }] =
      await Promise.all([
        supabase
          .from("insurance_eligibility")
          .select("*")
          .eq("tenant_check_id", checkId)
          .maybeSingle(),
        supabase
          .from("tenant_check_protection_options")
          .select(
            `
              *,
              protection_packages (*)
            `,
          )
          .eq("tenant_check_id", checkId)
          .order("created_at", { ascending: true }),
        supabase
          .from("deposit_protection_quotes")
          .select("*")
          .eq("tenant_check_id", checkId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    return {
      depositQuote: depositQuote ?? null,
      insuranceEligibility: insuranceEligibility ?? null,
      protectionOptions: ((protectionOptions ?? []) as Array<Record<string, unknown>>).map((item) => ({
        ...item,
        protection_packages: Array.isArray(item.protection_packages)
          ? item.protection_packages[0] ?? null
          : item.protection_packages,
      })) as ProtectionSnapshot["protectionOptions"],
    };
  } catch {
    return null;
  }
}

function normalizeDetail(data: Record<string, unknown>) {
  return {
    ...data,
    properties: Array.isArray(data.properties) ? data.properties[0] ?? null : data.properties,
    tenant_documents: Array.isArray(data.tenant_documents) ? data.tenant_documents : [],
    tenant_public_profiles: Array.isArray(data.tenant_public_profiles)
      ? data.tenant_public_profiles[0] ?? null
      : data.tenant_public_profiles,
    ai_reports: Array.isArray(data.ai_reports) ? data.ai_reports[0] ?? null : data.ai_reports,
  } as TenantCheckDetail;
}
