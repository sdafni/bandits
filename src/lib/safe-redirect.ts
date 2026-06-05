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

export function splitInternalPath(value: string | null | undefined, fallback = "/dashboard") {
  const sanitized = sanitizeInternalPath(value, fallback);
  const queryIndex = sanitized.indexOf("?");

  if (queryIndex === -1) {
    return { pathname: sanitized, search: "" };
  }

  return {
    pathname: sanitized.slice(0, queryIndex),
    search: sanitized.slice(queryIndex),
  };
}
