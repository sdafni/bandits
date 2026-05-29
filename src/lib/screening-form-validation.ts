import { z } from "zod";
import {
  formEntry,
  parseFormSchema,
  preprocessFormNumber,
  preprocessFormString,
  preprocessOptionalFormString,
  type FieldErrors,
  type ParseFormResult,
} from "@/lib/form-validation";
import type { ScreeningValidationMessages } from "@/lib/screening-validation-messages";

export const SCREENING_FORM_FIELDS = {
  propertyName: "property_name",
  monthlyRent: "monthly_rent",
  addressLine1: "address_line1",
  city: "city",
  postalCode: "postal_code",
  tenantFullName: "tenant_full_name",
  tenantEmail: "tenant_email",
  tenantPhone: "tenant_phone",
  requestedDocuments: "requested_documents",
} as const;

export type ScreeningFormValues = {
  propertyName: string;
  monthlyRent: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  tenantFullName: string;
  tenantEmail: string;
  tenantPhone: string;
  requestedDocuments: string[];
};

function createScreeningSubmitSchema(messages: ScreeningValidationMessages) {
  return z.object({
    propertyName: z.preprocess(preprocessFormString, z.string().trim().min(2, messages.propertyName)),
    addressLine1: z.preprocess(preprocessFormString, z.string().trim().min(6, messages.addressLine1)),
    city: z.preprocess(preprocessFormString, z.string().trim().min(2, messages.city)),
    postalCode: z.preprocess(preprocessOptionalFormString, z.string().trim().max(12).optional()),
    monthlyRent: z.preprocess(
      preprocessFormNumber,
      z
        .number({ error: messages.monthlyRent })
        .positive(messages.monthlyRentPositive),
    ),
    tenantFullName: z.preprocess(preprocessFormString, z.string().trim().min(2, messages.tenantFullName)),
    tenantEmail: z.preprocess(
      preprocessFormString,
      z.union([z.literal(""), z.string().trim().email(messages.tenantEmail)]),
    ),
    tenantPhone: z.preprocess(preprocessOptionalFormString, z.string().trim().max(40).optional()),
    requestedDocuments: z.array(z.string().trim().min(1)).min(1, messages.requestedDocuments),
  });
}

const SCHEMA_TO_FORM_FIELD: Record<string, string> = {
  propertyName: SCREENING_FORM_FIELDS.propertyName,
  monthlyRent: SCREENING_FORM_FIELDS.monthlyRent,
  addressLine1: SCREENING_FORM_FIELDS.addressLine1,
  city: SCREENING_FORM_FIELDS.city,
  postalCode: SCREENING_FORM_FIELDS.postalCode,
  tenantFullName: SCREENING_FORM_FIELDS.tenantFullName,
  tenantEmail: SCREENING_FORM_FIELDS.tenantEmail,
  tenantPhone: SCREENING_FORM_FIELDS.tenantPhone,
  requestedDocuments: SCREENING_FORM_FIELDS.requestedDocuments,
};

export function mapScreeningFieldErrors(fieldErrors: FieldErrors): FieldErrors {
  const mapped: FieldErrors = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    mapped[SCHEMA_TO_FORM_FIELD[key] ?? key] = message;
  }
  return mapped;
}

export function screeningValuesFromFormData(formData: FormData): ScreeningFormValues {
  return {
    propertyName: formEntry(formData.get(SCREENING_FORM_FIELDS.propertyName)),
    monthlyRent: formEntry(formData.get(SCREENING_FORM_FIELDS.monthlyRent)),
    addressLine1: formEntry(formData.get(SCREENING_FORM_FIELDS.addressLine1)),
    city: formEntry(formData.get(SCREENING_FORM_FIELDS.city)),
    postalCode: formEntry(formData.get(SCREENING_FORM_FIELDS.postalCode)),
    tenantFullName: formEntry(formData.get(SCREENING_FORM_FIELDS.tenantFullName)),
    tenantEmail: formEntry(formData.get(SCREENING_FORM_FIELDS.tenantEmail)),
    tenantPhone: formEntry(formData.get(SCREENING_FORM_FIELDS.tenantPhone)),
    requestedDocuments: formData
      .getAll(SCREENING_FORM_FIELDS.requestedDocuments)
      .map((value) => String(value))
      .filter(Boolean),
  };
}

export function screeningStepForField(fieldId: string): number {
  if (
    fieldId === SCREENING_FORM_FIELDS.propertyName ||
    fieldId === SCREENING_FORM_FIELDS.monthlyRent ||
    fieldId === SCREENING_FORM_FIELDS.addressLine1 ||
    fieldId === SCREENING_FORM_FIELDS.city ||
    fieldId === SCREENING_FORM_FIELDS.postalCode
  ) {
    return 1;
  }
  if (
    fieldId === SCREENING_FORM_FIELDS.tenantFullName ||
    fieldId === SCREENING_FORM_FIELDS.tenantEmail ||
    fieldId === SCREENING_FORM_FIELDS.tenantPhone
  ) {
    return 2;
  }
  if (fieldId === SCREENING_FORM_FIELDS.requestedDocuments) {
    return 3;
  }
  return 4;
}

export function validateScreeningSubmit(
  values: ScreeningFormValues,
  messages: ScreeningValidationMessages,
): ParseFormResult<z.infer<ReturnType<typeof createScreeningSubmitSchema>>> {
  const result = parseFormSchema(createScreeningSubmitSchema(messages), values, messages.formFallback);
  if (!result.success) {
    return { ...result, fieldErrors: mapScreeningFieldErrors(result.fieldErrors) };
  }
  return result;
}

export function validateScreeningStep(
  step: number,
  values: ScreeningFormValues,
  messages: ScreeningValidationMessages,
): { fieldErrors: FieldErrors; error?: string } {
  const fieldErrors: FieldErrors = {};

  if (step === 1) {
    if (values.propertyName.trim().length < 2) {
      fieldErrors[SCREENING_FORM_FIELDS.propertyName] = messages.propertyName;
    }
    if (values.addressLine1.trim().length < 6) {
      fieldErrors[SCREENING_FORM_FIELDS.addressLine1] = messages.addressLine1;
    }
    if (values.city.trim().length < 2) {
      fieldErrors[SCREENING_FORM_FIELDS.city] = messages.city;
    }
    const rent = Number(values.monthlyRent);
    if (!values.monthlyRent.trim() || !Number.isFinite(rent) || rent <= 0) {
      fieldErrors[SCREENING_FORM_FIELDS.monthlyRent] = messages.monthlyRent;
    }
  }

  if (step === 2) {
    if (values.tenantFullName.trim().length < 2) {
      fieldErrors[SCREENING_FORM_FIELDS.tenantFullName] = messages.tenantFullName;
    }
    if (values.tenantEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.tenantEmail.trim())) {
      fieldErrors[SCREENING_FORM_FIELDS.tenantEmail] = messages.tenantEmail;
    }
  }

  if (step === 3) {
    if (values.requestedDocuments.length === 0) {
      fieldErrors[SCREENING_FORM_FIELDS.requestedDocuments] = messages.requestedDocuments;
    }
  }

  const firstError = Object.values(fieldErrors)[0];
  return { fieldErrors, error: firstError };
}

export function scrollToFirstFieldError(fieldErrors: FieldErrors) {
  if (typeof window === "undefined") {
    return;
  }

  const firstKey = Object.keys(fieldErrors)[0];
  if (!firstKey) {
    return;
  }

  const element = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = element?.querySelector<HTMLElement>("input, select, textarea, button");
  focusable?.focus();
}
