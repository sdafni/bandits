import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

type SessionPayload = {
  accessToken?: string;
  refreshToken?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as SessionPayload | null;
  const accessToken = body?.accessToken;
  const refreshToken = body?.refreshToken;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Missing confirmation session tokens." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
