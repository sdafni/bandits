import { redirect } from "next/navigation";
import { env, hasSupabaseServiceEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function getCurrentUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null as UserRow | null };
  }

  const profile = await ensureUserProfile(user.id, user.email ?? "", user.user_metadata?.full_name ?? null);

  return { user, profile };
}

export async function requireAuthenticatedUser() {
  const context = await getCurrentUserContext();

  if (!context.user || !context.profile) {
    redirect("/login");
  }

  return context;
}

export async function requireLandlord() {
  const context = await requireAuthenticatedUser();

  if (isAdminContext(context.profile.email, context.profile.role)) {
    redirect("/admin/review");
  }

  return context;
}

/** For API routes: return null instead of redirecting when unauthenticated. */
export async function getLandlordContextForApi() {
  const context = await getCurrentUserContext();

  if (!context.user || !context.profile) {
    return null;
  }

  if (isAdminContext(context.profile.email, context.profile.role)) {
    return null;
  }

  return context;
}

export async function requireAdmin() {
  const context = await requireAuthenticatedUser();

  if (!isAdminContext(context.profile.email, context.profile.role)) {
    redirect("/dashboard");
  }

  return context;
}

export function isAdminContext(email: string, role: string) {
  return role === "admin" || (hasSupabaseServiceEnv() && env.adminEmails.includes(email.toLowerCase()));
}

async function ensureUserProfile(userId: string, email: string, fullName: string | null) {
  const supabase = await createClient();
  const normalizedEmail = email.toLowerCase();
  const isConfiguredAdmin = env.adminEmails.includes(normalizedEmail);
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    if (isConfiguredAdmin && data.role !== "admin" && hasSupabaseServiceEnv()) {
      const admin = createAdminClient();
      const { data: updated, error: updateError } = await admin
        .from("users")
        .update({ role: "admin" })
        .eq("id", userId)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      return updated;
    }

    return data;
  }

  if (hasSupabaseServiceEnv()) {
    const admin = createAdminClient();
    const { data: upserted, error: upsertError } = await admin
      .from("users")
      .upsert(
        {
          id: userId,
          email: normalizedEmail,
          full_name: fullName,
          role: isConfiguredAdmin ? "admin" : "landlord",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return upserted;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      email: normalizedEmail,
      full_name: fullName,
      id: userId,
      role: "landlord",
    })
    .select("*")
    .single();

  if (!insertError) {
    return inserted;
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  throw insertError;
}
