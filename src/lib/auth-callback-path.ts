import { sanitizeInternalPath } from "@/lib/safe-redirect";

export function getAuthCallbackNextPath(next: string | null | undefined, type: string | null | undefined) {
  if (type === "recovery") {
    return "/login/reset-password";
  }

  return sanitizeInternalPath(next, "/dashboard");
}
