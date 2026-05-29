import { z } from "zod";

export type FieldErrors = Record<string, string>;

const INTERNAL_ERROR_PATTERNS = [
  /invalid input/i,
  /expected string/i,
  /received null/i,
  /received undefined/i,
  /\bzod\b/i,
  /prisma/i,
  /postgres/i,
  /pgrst/i,
  /jwt/i,
  /stack trace/i,
  /typeerror/i,
  /syntaxerror/i,
];

export function formEntry(value: FormDataEntryValue | null | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  return "";
}

export function optionalFormEntry(value: FormDataEntryValue | null | undefined): string | undefined {
  const normalized = formEntry(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function preprocessFormString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function preprocessOptionalFormString(value: unknown): string | undefined {
  const normalized = preprocessFormString(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function preprocessFormNumber(value: unknown): number | undefined {
  const raw = preprocessFormString(value).trim();
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isInternalErrorMessage(message: string) {
  const normalized = message.trim();
  if (!normalized) {
    return true;
  }
  if (normalized.length > 160) {
    return true;
  }
  return INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function sanitizeUserFacingError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) {
    return fallback;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (isInternalErrorMessage(message)) {
    return fallback;
  }

  return message;
}

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      const message = issue.message;
      fieldErrors[key] = isInternalErrorMessage(message)
        ? "Please check this field."
        : message;
    }
  }

  return fieldErrors;
}

export function firstFieldError(fieldErrors: FieldErrors): string | undefined {
  const values = Object.values(fieldErrors);
  return values[0];
}

export function firstZodIssueMessage(error: z.ZodError, fallback: string) {
  const fieldErrors = zodFieldErrors(error);
  return firstFieldError(fieldErrors) ?? fallback;
}

export type ParseFormResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors: FieldErrors };

export function parseFormSchema<T extends z.ZodTypeAny>(
  schema: T,
  values: unknown,
  fallback = "Please check the highlighted fields.",
): ParseFormResult<z.infer<T>> {
  const parsed = schema.safeParse(values);

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const fieldErrors = zodFieldErrors(parsed.error);
  return {
    success: false,
    error: firstFieldError(fieldErrors) ?? fallback,
    fieldErrors,
  };
}
