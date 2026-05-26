"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseBrowserEnv, env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

export function createClient() {
  assertSupabaseBrowserEnv();
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
