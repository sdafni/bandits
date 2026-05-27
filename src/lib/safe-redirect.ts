/**
 * Reject protocol-relative and external open redirects while allowing internal paths.
 */
export function sanitizeInternalPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  if (trimmed.includes("://") || trimmed.includes("@")) {
    return fallback;
  }

  return trimmed;
}
