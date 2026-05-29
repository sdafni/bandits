import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";
import { getDocumentDefinition } from "@/lib/trust-workflows";

const DOCUMENT_KEYS: Record<string, string> = {
  passport: "documents.passport",
  national_id: "documents.nationalId",
  residency_permit: "documents.residencyPermit",
  payslips: "documents.payslips",
  employment_contract: "documents.employmentContract",
  tax_return: "documents.taxReturn",
  accountant_letter: "documents.accountantLetter",
  freelance_income: "documents.freelanceIncome",
  relocation_contract: "documents.relocationContract",
  bank_statement: "documents.bankStatement",
  proof_of_savings: "documents.proofOfSavings",
  landlord_reference: "documents.landlordReference",
  previous_lease_agreement: "documents.previousLease",
  guarantor_documents: "documents.guarantor",
  visa_documents: "documents.visa",
  pet_documentation: "documents.pet",
};

const CATEGORY_KEYS: Record<string, string> = {
  identity: "documents.categoryIdentity",
  income: "documents.categoryIncome",
  financial: "documents.categoryFinancial",
  rental_history: "documents.categoryRentalHistory",
  optional: "documents.categoryOptional",
};

export function getLocalizedDocumentLabel(locale: AppLocale, value: string) {
  const key = DOCUMENT_KEYS[value];
  if (key) {
    return translate(locale, key);
  }
  return getDocumentDefinition(value)?.label ?? value.replaceAll("_", " ");
}

export function getLocalizedDocumentCategoryLabel(locale: AppLocale, category: string) {
  const key = CATEGORY_KEYS[category];
  return key ? translate(locale, key) : category;
}
