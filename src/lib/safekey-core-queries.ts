import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CaseReviewerNote } from "@/lib/safekey-core";

export async function getCaseReviewerNotes(checkId: string): Promise<CaseReviewerNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_reviewer_notes")
    .select("id, body, author_role, created_at")
    .eq("tenant_check_id", checkId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.message.includes("case_reviewer_notes")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((note) => ({
    authorRole: note.author_role as CaseReviewerNote["authorRole"],
    body: note.body,
    createdAt: note.created_at,
    id: note.id,
  }));
}

export async function getCaseReviewerNotesAdmin(checkId: string): Promise<CaseReviewerNote[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("case_reviewer_notes")
    .select("id, body, author_role, created_at")
    .eq("tenant_check_id", checkId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.message.includes("case_reviewer_notes")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((note) => ({
    authorRole: note.author_role as CaseReviewerNote["authorRole"],
    body: note.body,
    createdAt: note.created_at,
    id: note.id,
  }));
}
