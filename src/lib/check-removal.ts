type RemovableCheck = {
  status: string;
  tenant_documents: Array<{ id: string }>;
  workflow_activated_at?: string | null;
};

/** Landlords may remove checks that never received tenant documents. */
export function canLandlordRemoveCheck(check: RemovableCheck): boolean {
  if (check.tenant_documents.length > 0) {
    return false;
  }

  if (check.status === "draft") {
    return true;
  }

  if (check.status === "pending_upload") {
    return true;
  }

  return false;
}

export function getLandlordCheckKindLabel(check: RemovableCheck & { workflow_activated_at?: string | null }): "draft" | "preview" | "active" {
  if (check.status === "draft" || !check.workflow_activated_at) {
    return "draft";
  }

  if (check.status === "pending_upload") {
    return "preview";
  }

  return "active";
}
