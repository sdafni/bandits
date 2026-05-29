const DISMISSED_DEMO_CASES_KEY = "safekey.dismissed-demo-cases.v1";

export function readDismissedDemoCaseIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_DEMO_CASES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    window.localStorage.removeItem(DISMISSED_DEMO_CASES_KEY);
    return [];
  }
}

export function dismissDemoCaseId(checkId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const next = new Set(readDismissedDemoCaseIds());
  next.add(checkId);
  window.localStorage.setItem(DISMISSED_DEMO_CASES_KEY, JSON.stringify([...next]));
}

export function restoreDemoCaseId(checkId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const next = readDismissedDemoCaseIds().filter((id) => id !== checkId);
  window.localStorage.setItem(DISMISSED_DEMO_CASES_KEY, JSON.stringify(next));
}
