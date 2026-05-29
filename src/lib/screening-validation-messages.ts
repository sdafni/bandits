import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";

export type ScreeningValidationMessages = {
  propertyName: string;
  addressLine1: string;
  city: string;
  monthlyRent: string;
  monthlyRentPositive: string;
  tenantFullName: string;
  tenantEmail: string;
  requestedDocuments: string;
  formFallback: string;
};

export function getScreeningValidationMessages(locale: AppLocale): ScreeningValidationMessages {
  return {
    propertyName: translate(locale, "screeningForm.validation.propertyName"),
    addressLine1: translate(locale, "screeningForm.validation.addressLine1"),
    city: translate(locale, "screeningForm.validation.city"),
    monthlyRent: translate(locale, "screeningForm.validation.monthlyRent"),
    monthlyRentPositive: translate(locale, "screeningForm.validation.monthlyRentPositive"),
    tenantFullName: translate(locale, "screeningForm.validation.tenantFullName"),
    tenantEmail: translate(locale, "screeningForm.validation.tenantEmail"),
    requestedDocuments: translate(locale, "screeningForm.validation.requestedDocuments"),
    formFallback: translate(locale, "screeningForm.validation.formFallback"),
  };
}
