import { PageSkeleton } from "@/components/page-skeleton";
import { translate } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function DashboardLoading() {
  const locale = await getRequestLocale();

  return (
    <PageSkeleton
      subtitle={translate(locale, "dashboard.loadingSubtitle")}
      title={translate(locale, "dashboard.title")}
    />
  );
}
