import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  detectLocaleFromPath,
  LOCALE_COOKIE,
  pickLocaleFromAcceptLanguage,
  stripLocaleFromPath,
} from "@/lib/i18n";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? request.nextUrl.host.toLowerCase();

  if (host === "www.getsafekey.app") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https";
    canonicalUrl.host = "getsafekey.app";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname.startsWith("/api");
  const isStaticAsset = pathname.startsWith("/_next") || pathname.includes(".");

  if (!isApiPath && !isStaticAsset) {
    const localeFromPath = detectLocaleFromPath(pathname);

    if (!localeFromPath) {
      const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
      const locale =
        pathname === "/"
          ? DEFAULT_LOCALE
          : cookieLocale === "el" || cookieLocale === "en"
            ? cookieLocale
            : pickLocaleFromAcceptLanguage(request.headers.get("accept-language"));
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(redirectUrl, 307);
    }

    // Keep localized URLs (/el, /en) while resolving existing unprefixed routes.
    request.nextUrl.pathname = stripLocaleFromPath(pathname);
    const sessionResponse = await updateSession(request);
    if (sessionResponse.headers.get("location")) {
      return sessionResponse;
    }

    const rewrittenResponse = NextResponse.rewrite(request.nextUrl);
    rewrittenResponse.headers.set("x-safekey-locale", localeFromPath);
    for (const cookie of sessionResponse.cookies.getAll()) {
      rewrittenResponse.cookies.set(cookie);
    }
    rewrittenResponse.cookies.set(LOCALE_COOKIE, localeFromPath, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
    return rewrittenResponse;
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
