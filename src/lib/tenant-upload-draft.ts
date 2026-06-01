export type TenantUploadProfileDraft = {
  consentConfirmed?: boolean;
  currentAddress?: string;
  email?: string;
  employerName?: string;
  employmentStatus?: string;
  fullName?: string;
  monthlyIncome?: string;
  moveInDate?: string;
  notes?: string;
  phone?: string;
};

const STORAGE_PREFIX = "safekey-upload-draft:";

export function getTenantUploadDraftStorageKey(token: string) {
  return `${STORAGE_PREFIX}${token}`;
}

export function readTenantUploadDraft(token: string): TenantUploadProfileDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getTenantUploadDraftStorageKey(token));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as TenantUploadProfileDraft;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTenantUploadDraft(token: string, draft: TenantUploadProfileDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getTenantUploadDraftStorageKey(token), JSON.stringify(draft));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearTenantUploadDraft(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(getTenantUploadDraftStorageKey(token));
  } catch {
    // Ignore storage errors.
  }
}

export function mergeTenantUploadProfileDraft(params: {
  fallbackName: string;
  localDraft: TenantUploadProfileDraft | null;
  savedProfile: TenantUploadProfileDraft | null;
}): TenantUploadProfileDraft {
  return {
    consentConfirmed: params.savedProfile?.consentConfirmed ?? params.localDraft?.consentConfirmed ?? false,
    currentAddress: params.savedProfile?.currentAddress ?? params.localDraft?.currentAddress ?? "",
    email: params.savedProfile?.email ?? params.localDraft?.email ?? "",
    employerName: params.savedProfile?.employerName ?? params.localDraft?.employerName ?? "",
    employmentStatus: params.savedProfile?.employmentStatus ?? params.localDraft?.employmentStatus ?? "",
    fullName: params.savedProfile?.fullName ?? params.localDraft?.fullName ?? params.fallbackName,
    monthlyIncome: params.savedProfile?.monthlyIncome ?? params.localDraft?.monthlyIncome ?? "",
    moveInDate: params.savedProfile?.moveInDate ?? params.localDraft?.moveInDate ?? "",
    notes: params.savedProfile?.notes ?? params.localDraft?.notes ?? "",
    phone: params.savedProfile?.phone ?? params.localDraft?.phone ?? "",
  };
}
