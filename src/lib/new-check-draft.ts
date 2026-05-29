export const NEW_SCREENING_DRAFT_KEY = "safekey.new-screening.draft.v1";

export type NewCheckDraft = {
  propertyName?: string;
  monthlyRent?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  tenantFullName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  requestedDocuments?: string[];
  step?: number;
};

export function readNewCheckDraft(): NewCheckDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(NEW_SCREENING_DRAFT_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as NewCheckDraft;
  } catch {
    window.localStorage.removeItem(NEW_SCREENING_DRAFT_KEY);
    return null;
  }
}

export function saveNewCheckDraft(draft: NewCheckDraft) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(NEW_SCREENING_DRAFT_KEY, JSON.stringify(draft));
}

export function clearNewCheckDraft() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(NEW_SCREENING_DRAFT_KEY);
}

/** True when the user has meaningful in-progress form data (not yet submitted to the server). */
export function hasUnfinishedNewCheckDraft(draft: NewCheckDraft | null): boolean {
  if (!draft) {
    return false;
  }

  if ((draft.step ?? 1) > 1) {
    return true;
  }

  return Boolean(
    draft.propertyName?.trim() ||
      draft.addressLine1?.trim() ||
      draft.monthlyRent?.trim() ||
      draft.tenantFullName?.trim() ||
      draft.tenantEmail?.trim() ||
      draft.tenantPhone?.trim(),
  );
}

export function getDraftSummaryLabel(draft: NewCheckDraft | null): string | null {
  if (!draft) {
    return null;
  }

  const tenant = draft.tenantFullName?.trim();
  const property = draft.propertyName?.trim();

  if (tenant && property) {
    return `${tenant} · ${property}`;
  }

  return tenant ?? property ?? null;
}
