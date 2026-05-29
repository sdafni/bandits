import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_COOKIE } from "@/lib/i18n";

const LOCALE_HEADER = "x-safekey-locale";

export async function getRequestLocale() {
  const headerStore = await headers();
  const headerLocale = headerStore.get(LOCALE_HEADER);
  if (isSupportedLocale(headerLocale)) {
    return headerLocale;
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }
  return DEFAULT_LOCALE;
}
