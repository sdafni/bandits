import type { Database } from "@/lib/database.types";
import { formatDate } from "@/lib/utils";

type TenantCheckRow = Database["public"]["Tables"]["tenant_checks"]["Row"];
type TenantCheckStatus = TenantCheckRow["status"];

const DOCUMENT_LABELS: Record<string, string> = {
  bank_statement: "Bank statements",
  employment_letter: "Employment letter",
  employment_contract: "Employment contract",
  government_id: "ID document",
  national_id: "National ID",
  passport: "Passport",
  payslips: "Payslips",
  proof_of_income: "Proof of income",
  landlord_reference: "Landlord reference",
  rental_reference: "Landlord reference",
  supporting_document: "Supporting document",
  tax_return: "Tax return",
};

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
        analystState: "Waiting for your documents",
        complianceState: "Upload link is open",
        humanState: "Please upload your documents",
        nextStep: "Use the form on this page",
      };
    case "documents_received":
      return {
        analystState: "Documents received",
        complianceState: "Documents saved securely",
        humanState: "Documents received — thank you",
        nextStep: "Your landlord will be notified",
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

export function getOperationalTimestamp(check: Pick<TenantCheckRow, "created_at" | "review_requested_at" | "review_completed_at" | "status">) {
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
    .map((item) => DOCUMENT_LABELS[item] ?? item.replaceAll("_", " "))
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
