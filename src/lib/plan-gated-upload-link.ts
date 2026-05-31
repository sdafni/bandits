import type { AppLocale } from "@/lib/i18n";
import { withLocalePath } from "@/lib/i18n";

export function getPlansPagePath(locale: AppLocale) {
  return withLocalePath(locale, "/dashboard/billing");
}
