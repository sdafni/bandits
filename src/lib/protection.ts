import type { Database, DepositProtectionQuoteStatus, InsuranceEligibilityStatus } from "@/lib/database.types";

type AiReportRow = Database["public"]["Tables"]["ai_reports"]["Row"];
type TenantProfileRow = Database["public"]["Tables"]["tenant_public_profiles"]["Row"];
type ProtectionPackageRow = Database["public"]["Tables"]["protection_packages"]["Row"];

type ProtectionInput = {
  aiReport: AiReportRow | null;
  documents: Array<{ document_type: string }>;
  propertyMonthlyRent: number | null;
  requestedDocuments: string[];
  tenantProfile: TenantProfileRow | null;
};

export type ProtectionOptionPreview = {
  coverageItems: string[];
  description: string;
  eligibilityStatus: InsuranceEligibilityStatus;
  estimatedPrice: string;
  label: "recommended" | "optional";
  name: string;
  recommendationReason: string;
  type: Database["public"]["Tables"]["protection_packages"]["Row"]["type"];
};

export type DepositProtectionPreview = {
  coverageAmount: number | null;
  proposedProtectionFee: number | null;
  rentAmount: number | null;
  status: DepositProtectionQuoteStatus;
  summary: string;
  traditionalDepositAmount: number | null;
};

export type ProtectionAssessment = {
  eligibilityReason: string;
  missingRequirements: string[];
  nextAction: string;
  packageOptions: ProtectionOptionPreview[];
  recommendedPackage: string | null;
  riskScore: number;
  status: InsuranceEligibilityStatus;
  depositQuote: DepositProtectionPreview | null;
};

const PACKAGE_CATALOG: Array<
  Pick<ProtectionPackageRow, "coverage_items" | "description" | "estimated_price" | "name" | "type">
> = [
  {
    coverage_items: [
      "Screened applicant record",
      "Basic tenant default review",
      "Indicative protection onboarding support",
    ],
    description:
      "Entry-level rental protection for lower-risk applicants where the landlord wants a simple trust layer after screening.",
    estimated_price: "€19/month",
    name: "Basic Rental Protection",
    type: "screening-linked-protection",
  },
  {
    coverage_items: [
      "Deposit alternative structure",
      "Damage and breach guarantee support",
      "Landlord protection workflow layer",
    ],
    description:
      "Insurance-backed alternative to a traditional cash deposit, intended as a future SafeKey partner product.",
    estimated_price: "€29/month",
    name: "Deposit Protection",
    type: "deposit-protection",
  },
  {
    coverage_items: [
      "Unpaid rent cover pathway",
      "Missed payment response support",
      "Eligibility tied to affordability signals",
    ],
    description:
      "Package for rent default protection where income and affordability signals are strong enough.",
    estimated_price: "€39/month",
    name: "Unpaid Rent Protection",
    type: "rent-protection",
  },
  {
    coverage_items: [
      "Damage event support",
      "Property restoration workflow",
      "Claims handoff structure",
    ],
    description: "Package for accidental or malicious property damage scenarios.",
    estimated_price: "€24/month",
    name: "Property Damage Protection",
    type: "damage-protection",
  },
  {
    coverage_items: [
      "Recovery coordination support",
      "Case escalation workflow",
      "Partner legal workflow",
    ],
    description: "Legal support layer for recovery and breach response scenarios.",
    estimated_price: "€34/month",
    name: "Legal Recovery Support",
    type: "legal-support",
  },
  {
    coverage_items: [
      "Rent protection layer",
      "Deposit protection layer",
      "Damage support layer",
      "Legal recovery support",
    ],
    description:
      "Combined flagship package linking screening, rent protection, deposit protection, and damage/legal layers.",
    estimated_price: "€69/month",
    name: "Full SafeKey Protection",
    type: "full-protection",
  },
];

export function buildProtectionAssessment(
  input: ProtectionInput,
  options?: {
    manualOverrideNote?: string | null;
    overrideStatus?: InsuranceEligibilityStatus;
  },
): ProtectionAssessment | null {
  if (!input.aiReport) {
    return null;
  }

  const aiReport = input.aiReport;

  const providedTypes = new Set(input.documents.map((document) => document.document_type));
  const missingDocuments =
    aiReport.missing_documents.length > 0
      ? aiReport.missing_documents
      : input.requestedDocuments.filter((document) => !providedTypes.has(document));

  const redFlags = aiReport.red_flags.map((flag) => flag.toLowerCase());
  const extractedSignals = aiReport.reasoning.extractedSignals.map((signal) => signal.toLowerCase());
  const income = input.tenantProfile?.monthly_income ?? null;
  const rent = input.propertyMonthlyRent ?? null;
  const rentToIncomeRatio = income && rent ? rent / income : null;
  const employmentStatus = input.tenantProfile?.employment_status?.toLowerCase() ?? "";
  const currentAddress = input.tenantProfile?.current_address?.trim() ?? "";

  const missingRequirements: string[] = [];
  const hasCriticalMissingDocuments = missingDocuments.some((item) =>
    ["government_id", "proof_of_income", "employment_letter", "bank_statement", "rental_reference"].includes(item),
  );

  if (!currentAddress) {
    missingRequirements.push("Current residential address still needs verification.");
  }

  if (hasCriticalMissingDocuments) {
    missingRequirements.push("A critical screening document is still missing.");
  }

  if (rentToIncomeRatio == null) {
    missingRequirements.push("Rent-to-income ratio could not be calculated yet.");
  }

  const severeFraudSignal =
    redFlags.some((flag) =>
      ["fraud", "forged", "identity mismatch", "eviction", "default", "court"].some((term) =>
        flag.includes(term),
      ),
    ) ||
    extractedSignals.some((signal) =>
      ["fraud", "forged", "identity mismatch", "eviction", "default", "court"].includes(signal),
    );

  const unstableEmployment =
    employmentStatus.includes("unemployed") ||
    employmentStatus.includes("temporary") ||
    employmentStatus.includes("contract") ||
    employmentStatus.includes("seasonal");

  const referenceConcern =
    missingDocuments.includes("rental_reference") ||
    redFlags.some((flag) => flag.includes("arrears") || flag.includes("late payment") || flag.includes("reference"));

  let status: InsuranceEligibilityStatus;
  let eligibilityReason: string;

  if (options?.overrideStatus) {
    status = options.overrideStatus;
    eligibilityReason = options.manualOverrideNote?.trim()
      ? `Admin override: ${options.manualOverrideNote.trim()}`
      : `Admin override applied: ${formatEligibilityStatus(options.overrideStatus)}.`;
  } else if (hasCriticalMissingDocuments || !currentAddress || rentToIncomeRatio == null) {
    status = "pending_more_documents";
    eligibilityReason =
      "Protection eligibility is pending because one or more core screening signals are still incomplete.";
  } else if (
    severeFraudSignal ||
    aiReport.score < 50 ||
    (rentToIncomeRatio != null && rentToIncomeRatio > 0.55) ||
    unstableEmployment ||
    referenceConcern
  ) {
    status = "not_eligible";
    eligibilityReason =
      "The current screening result indicates a higher protection risk due to affordability, fraud, employment, or reference concerns.";
  } else if (
    aiReport.score >= 78 &&
    (rentToIncomeRatio == null || rentToIncomeRatio <= 0.4) &&
    !unstableEmployment &&
    !referenceConcern &&
    !severeFraudSignal
  ) {
    status = "eligible";
    eligibilityReason =
      "The case currently meets SafeKey's protection thresholds for affordability, document quality, and risk stability.";
  } else {
    status = "conditionally_eligible";
    eligibilityReason =
      "The tenant may qualify for selected protection products, but the current signals suggest a conditional review path rather than automatic approval.";
  }

  if (missingDocuments.length > 0) {
    missingRequirements.push(
      ...missingDocuments.map((item) => `Missing requested document: ${item.replaceAll("_", " ")}.`),
    );
  }

  if (unstableEmployment) {
    missingRequirements.push("Employment appears unstable for automatic protection approval.");
  }

  if (!currentAddress) {
    missingRequirements.push("Residency certainty remains incomplete.");
  }

  if (referenceConcern) {
    missingRequirements.push("Previous landlord or rental reference status still needs manual review.");
  }

  const recommendedPackage = getRecommendedPackage(status, aiReport.score, rentToIncomeRatio);
  const packageOptions = PACKAGE_CATALOG.map((item) =>
    buildProtectionOption(item, {
      overallStatus: status,
      recommendedPackage,
      rentToIncomeRatio,
      riskScore: aiReport.score,
      severeFraudSignal,
    }),
  );

  return {
    eligibilityReason,
    missingRequirements: uniqueStrings(missingRequirements),
    nextAction: getNextProtectionAction(status),
    packageOptions,
    recommendedPackage,
    riskScore: aiReport.score,
    status,
    depositQuote: buildDepositProtectionPreview({
      overallStatus: status,
      rentAmount: rent,
    }),
  };
}

export function getFallbackProtectionPackages() {
  return PACKAGE_CATALOG;
}

export function formatEligibilityStatus(status: InsuranceEligibilityStatus) {
  return status.replaceAll("_", " ");
}

export function getEligibilityTone(status: InsuranceEligibilityStatus) {
  switch (status) {
    case "eligible":
      return "success";
    case "conditionally_eligible":
      return "warning";
    case "pending_more_documents":
      return "info";
    case "not_eligible":
      return "danger";
  }
}

export function formatDepositQuoteSummary(status: DepositProtectionQuoteStatus) {
  switch (status) {
    case "indicative_quote_ready":
      return "This is an indicative quote showing how SafeKey could replace a traditional deposit with a protection-backed fee.";
    case "needs_more_documents":
      return "Deposit protection can be quoted after the missing screening documents have been submitted and reviewed.";
    case "not_available":
      return "A deposit protection quote is not currently available because the case is outside the current eligibility range.";
    case "draft":
      return "A draft protection record exists, but the indicative quote is not ready yet.";
  }
}

function buildProtectionOption(
  item: Pick<ProtectionPackageRow, "coverage_items" | "description" | "estimated_price" | "name" | "type">,
  context: {
    overallStatus: InsuranceEligibilityStatus;
    recommendedPackage: string | null;
    rentToIncomeRatio: number | null;
    riskScore: number;
    severeFraudSignal: boolean;
  },
): ProtectionOptionPreview {
  let eligibilityStatus: InsuranceEligibilityStatus = context.overallStatus;
  let recommendationReason = "Indicative product fit based on the current screening outcome.";

  if (item.name === "Unpaid Rent Protection") {
    if (context.overallStatus === "eligible" && (context.rentToIncomeRatio ?? 1) <= 0.42) {
      eligibilityStatus = "eligible";
      recommendationReason = "Affordability and overall risk score are strong enough for rent protection review.";
    } else if (
      context.overallStatus === "conditionally_eligible" &&
      (context.rentToIncomeRatio ?? 1) <= 0.5
    ) {
      eligibilityStatus = "conditionally_eligible";
      recommendationReason = "Rent protection is possible, but affordability should be reviewed manually.";
    } else {
      eligibilityStatus = "not_eligible";
      recommendationReason = "Rent protection needs stronger affordability and lower risk signals.";
    }
  }

  if (item.name === "Deposit Protection") {
    if (context.severeFraudSignal) {
      eligibilityStatus = "not_eligible";
      recommendationReason = "Deposit protection is withheld when severe fraud indicators appear in the case.";
    } else if (context.overallStatus === "pending_more_documents") {
      eligibilityStatus = "pending_more_documents";
      recommendationReason = "Deposit protection can be quoted once the missing screening evidence is supplied.";
    } else {
      recommendationReason = "Deposit protection can act as a future alternative to a traditional cash deposit.";
    }
  }

  if (item.name === "Full SafeKey Protection") {
    if (context.overallStatus === "eligible" && context.riskScore >= 82 && !context.severeFraudSignal) {
      eligibilityStatus = "eligible";
      recommendationReason = "The overall case quality is strong enough for the full protection bundle.";
    } else if (context.overallStatus === "conditionally_eligible") {
      eligibilityStatus = "conditionally_eligible";
      recommendationReason = "The full bundle may be possible after partner review, but not as an automatic match.";
    } else if (context.overallStatus === "pending_more_documents") {
      eligibilityStatus = "pending_more_documents";
      recommendationReason = "The full bundle remains pending until the missing signals are supplied.";
    } else {
      eligibilityStatus = "not_eligible";
      recommendationReason = "The full protection bundle is reserved for the strongest tenant profiles.";
    }
  }

  if (item.name === "Property Damage Protection" && context.severeFraudSignal) {
    eligibilityStatus = "not_eligible";
    recommendationReason = "Property damage protection is paused while fraud concerns remain unresolved.";
  }

  if (item.name === "Legal Recovery Support" && context.overallStatus === "pending_more_documents") {
    eligibilityStatus = "pending_more_documents";
    recommendationReason = "Legal recovery support is held pending a fuller screening file.";
  }

  return {
    coverageItems: item.coverage_items,
    description: item.description,
    eligibilityStatus,
    estimatedPrice: item.estimated_price,
    label: context.recommendedPackage === item.name ? "recommended" : "optional",
    name: item.name,
    recommendationReason,
    type: item.type,
  };
}

function buildDepositProtectionPreview(input: {
  overallStatus: InsuranceEligibilityStatus;
  rentAmount: number | null;
}): DepositProtectionPreview | null {
  if (input.rentAmount == null) {
    return null;
  }

  const traditionalDepositAmount = roundCurrency(input.rentAmount * 2);
  const coverageAmount = traditionalDepositAmount;

  if (input.overallStatus === "not_eligible") {
    return {
      coverageAmount,
      proposedProtectionFee: null,
      rentAmount: input.rentAmount,
      status: "not_available",
      summary: formatDepositQuoteSummary("not_available"),
      traditionalDepositAmount,
    };
  }

  if (input.overallStatus === "pending_more_documents") {
    return {
      coverageAmount,
      proposedProtectionFee: null,
      rentAmount: input.rentAmount,
      status: "needs_more_documents",
      summary: formatDepositQuoteSummary("needs_more_documents"),
      traditionalDepositAmount,
    };
  }

  const multiplier = input.overallStatus === "eligible" ? 0.28 : 0.38;

  return {
    coverageAmount,
    proposedProtectionFee: roundCurrency(input.rentAmount * multiplier),
    rentAmount: input.rentAmount,
    status: "indicative_quote_ready",
    summary: formatDepositQuoteSummary("indicative_quote_ready"),
    traditionalDepositAmount,
  };
}

function getRecommendedPackage(
  status: InsuranceEligibilityStatus,
  riskScore: number,
  rentToIncomeRatio: number | null,
) {
  if (status === "eligible") {
    return riskScore >= 82 && (rentToIncomeRatio ?? 1) <= 0.4
      ? "Full SafeKey Protection"
      : "Unpaid Rent Protection";
  }

  if (status === "conditionally_eligible") {
    return "Basic Rental Protection";
  }

  if (status === "pending_more_documents") {
    return "Deposit Protection";
  }

  return null;
}

function getNextProtectionAction(status: InsuranceEligibilityStatus) {
  switch (status) {
    case "eligible":
      return "Proceed to package review.";
    case "conditionally_eligible":
      return "Request a manual insurance review before presenting final protection terms.";
    case "pending_more_documents":
      return "Collect the missing screening evidence before partner review.";
    case "not_eligible":
      return "Hold protection packaging and escalate for manual risk assessment if needed.";
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
