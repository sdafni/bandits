import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseBrowserEnv, env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  assertSupabaseBrowserEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie writes are not available in every server component context.
        }
      },
    },
  });
}
