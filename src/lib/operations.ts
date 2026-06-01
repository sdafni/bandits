import type { Database } from "@/lib/database.types";
import { resolveDocumentCollectionPhase } from "@/lib/document-submission";
import { normalizeDocumentType } from "@/lib/safekey-document-catalog";
import { formatDate } from "@/lib/utils";

type TenantCheckRow = Database["public"]["Tables"]["tenant_checks"]["Row"];
type TenantCheckStatus = TenantCheckRow["status"];

const DOCUMENT_LABELS: Record<string, string> = {
  afm: "AFM",
  bank_guarantee: "Bank guarantee",
  bank_statement: "Bank statement",
  employer_letter: "Employer letter",
  employment_contract: "Employment contract",
  guarantor: "Guarantor",
  landlord_reference: "Landlord reference",
  national_id: "National ID",
  passport: "Passport",
  payslips: "Payslips",
  recommendation_letter: "Recommendation letter",
  residence_permit: "Residence permit",
  tax_return: "Tax return",
  utility_bill: "Utility bill",
};

export function getTenantUploadOperationalState(params: {
  document_requirements?: unknown | null;
  requested_documents: string[];
  status: TenantCheckStatus;
  tenant_documents: Array<{ document_type: string; upload_status?: string | null }>;
}) {
  const collection = resolveDocumentCollectionPhase(params);

  switch (collection.phase) {
    case "waiting_for_documents":
      return {
        analystState: "Waiting for your documents",
        complianceState: "Upload link is open",
        humanState: "Please upload required documents first",
        nextStep: "Add required documents, then submit when ready",
      };
    case "partial_submission":
      return {
        analystState: "Application incomplete",
        complianceState: "Some documents received",
        humanState: `${collection.received} of ${collection.total} documents received`,
        nextStep:
          collection.missingRequired > 0
            ? "Upload the remaining required documents to submit"
            : "Add recommended documents to strengthen your profile, then submit",
      };
    case "documents_complete":
      return {
        analystState: "Required documents complete",
        complianceState: "Ready for review",
        humanState: "Required documents complete — thank you",
        nextStep: "SafeKey will begin review shortly",
      };
    case "under_review":
      return {
        analystState: "Under review",
        complianceState: "Being reviewed",
        humanState: "Being reviewed",
        nextStep: "You will hear back from your landlord",
      };
    case "report_ready":
      return {
        analystState: "Recommendation ready",
        complianceState: "Complete",
        humanState: "Complete",
        nextStep: "Your landlord has the recommendation",
      };
  }
}

export function getOperationalState(status: TenantCheckStatus) {
  switch (status) {
    case "draft":
      return {
        analystState: "Not started yet",
        complianceState: "Waiting to begin",
        humanState: "Waiting to begin",
        nextStep: "Your landlord will send you a link when ready",
      };
    case "pending_upload":
      return {
        analystState: "Awaiting tenant documents",
        complianceState: "Upload link active",
        humanState: "Please upload your documents",
        nextStep: "Upload required documents, then submit when ready",
      };
    case "documents_received":
      return {
        analystState: "Documents received",
        complianceState: "Queued for review",
        humanState: "Documents received",
        nextStep: "SafeKey review in progress",
      };
    case "under_review":
      return {
        analystState: "Under review",
        complianceState: "In review",
        humanState: "Under review",
        nextStep: "Report will be ready soon",
      };
    case "report_ready":
      return {
        analystState: "Report ready",
        complianceState: "Complete",
        humanState: "Recommendation ready",
        nextStep: "Review the SafeKey report",
      };
  }
}

export function getOperationalTimestamp(
  check: Pick<TenantCheckRow, "created_at" | "review_completed_at" | "review_requested_at" | "status">,
) {
  if (check.status === "report_ready" && check.review_completed_at) {
    return `Completed ${formatDate(check.review_completed_at)}`;
  }

  if (check.status === "under_review" && check.review_requested_at) {
    return `Review started ${formatDate(check.review_requested_at)}`;
  }

  if (check.status === "documents_received" && check.review_requested_at) {
    return `Documents received ${formatDate(check.review_requested_at)}`;
  }

  return `Opened ${formatDate(check.created_at)}`;
}

export function getVerificationChecklist(requestedDocuments: string[]) {
  const seen = new Set<string>();
  const items = requestedDocuments
    .map((item) => DOCUMENT_LABELS[normalizeDocumentType(item)] ?? item.replaceAll("_", " "))
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    });

  if (!items.some((item) => item.toLowerCase().includes("tax"))) {
    items.unshift("Tax return (if requested)");
  }

  return items.slice(0, 4);
}

export function getComplianceIndicators(status: TenantCheckStatus) {
  const state = getOperationalState(status);

  return ["Private link", "Secure upload", state.complianceState];
}
