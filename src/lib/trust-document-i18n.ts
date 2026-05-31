import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";
import { getCatalogDocumentDefinition } from "@/lib/safekey-document-catalog";

const DOCUMENT_KEYS: Record<string, string> = {
  afm: "documents.afm",
  passport: "documents.passport",
  national_id: "documents.nationalId",
  residence_permit: "documents.residencePermit",
  payslips: "documents.payslips",
  employer_letter: "documents.employerLetter",
  employment_contract: "documents.employmentContract",
  tax_return: "documents.taxReturn",
  bank_statement: "documents.bankStatement",
  landlord_reference: "documents.landlordReference",
  recommendation_letter: "documents.recommendationLetter",
  utility_bill: "documents.utilityBill",
  guarantor: "documents.guarantor",
  bank_guarantee: "documents.bankGuarantee",
};

const CATEGORY_KEYS: Record<string, string> = {
  identity: "documents.categoryIdentity",
  income: "documents.categoryIncome",
  financial: "documents.categoryFinancial",
  rental_history: "documents.categoryRentalHistory",
  trust_boost: "documents.categoryTrustBoost",
  advanced: "documents.categoryAdvanced",
};

export function getLocalizedDocumentLabel(locale: AppLocale, value: string) {
  const key = DOCUMENT_KEYS[value];
  if (key) {
    return translate(locale, key);
  }
  return getCatalogDocumentDefinition(value)?.label ?? value.replaceAll("_", " ");
}

export function getLocalizedDocumentCategoryLabel(locale: AppLocale, category: string) {
  const key = CATEGORY_KEYS[category];
  return key ? translate(locale, key) : category;
}
