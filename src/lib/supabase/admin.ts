import "server-only";

import { createClient } from "@supabase/supabase-js";
import { assertSupabaseServiceEnv, env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

export function createAdminClient() {
  assertSupabaseServiceEnv();

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
