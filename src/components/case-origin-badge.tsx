import { Badge } from "@/components/badge";
import { getCaseOriginBadgeLabel } from "@/lib/demo-data";

export function CaseOriginBadge({ checkId }: { checkId: string }) {
  const label = getCaseOriginBadgeLabel(checkId);

  if (!label) {
    return null;
  }

  return <Badge tone="neutral">{label}</Badge>;
}
