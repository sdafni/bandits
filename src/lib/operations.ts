import type { Database } from "@/lib/database.types";
import { formatDate } from "@/lib/utils";

type TenantCheckRow = Database["public"]["Tables"]["tenant_checks"]["Row"];
type TenantCheckStatus = TenantCheckRow["status"];

const DOCUMENT_LABELS: Record<string, string> = {
  bank_statement: "Liquidity review",
  employment_letter: "Proof of employment",
  government_id: "Identity and residency verification",
  proof_of_income: "Income validation",
  rental_reference: "Rental history review",
  supporting_document: "Supporting evidence",
  tax_return: "AFM and tax identity review",
};

export function getOperationalState(status: TenantCheckStatus) {
  switch (status) {
    case "pending_upload":
      return {
        analystState: "Verification requested",
        complianceState: "Upload controls active",
        humanState: "Awaiting supporting document",
        nextStep: "Tenant submission required",
      };
    case "documents_received":
      return {
        analystState: "Queued for analyst intake",
        complianceState: "Evidence stored and indexed",
        humanState: "Pending analyst review",
        nextStep: "Initial screening in progress",
      };
    case "under_review":
      return {
        analystState: "Under review by analyst",
        complianceState: "Audit timeline active",
        humanState: "Risk analysis in progress",
        nextStep: "Pending final recommendation",
      };
    case "report_ready":
      return {
        analystState: "Analyst review completed",
        complianceState: "Decision output locked",
        humanState: "Pending landlord approval",
        nextStep: "Final report available",
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

  if (!items.some((item) => item.includes("AFM"))) {
    items.unshift("AFM and tax identity review");
  }

  return items.slice(0, 4);
}

export function getComplianceIndicators(status: TenantCheckStatus) {
  const state = getOperationalState(status);

  return [
    "Role-based access enforced",
    state.complianceState,
    "Timeline activity retained",
  ];
}
