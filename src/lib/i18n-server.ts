import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_COOKIE } from "@/lib/i18n";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }
  return DEFAULT_LOCALE;
}
