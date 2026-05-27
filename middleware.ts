import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? request.nextUrl.host.toLowerCase();

  if (host === "www.getsafekey.app") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https";
    canonicalUrl.host = "getsafekey.app";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
