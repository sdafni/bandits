"use client";

import { Badge } from "@/components/badge";
import { getCaseOriginBadgeLabel } from "@/lib/demo-data";
import { useT } from "@/lib/i18n/context";

export function CaseOriginBadge({ checkId }: { checkId: string }) {
  const t = useT();
  const isSample = Boolean(getCaseOriginBadgeLabel(checkId));

  if (!isSample) {
    return null;
  }

  return <Badge tone="neutral">{t("workspace.sampleCaseBadge")}</Badge>;
}
