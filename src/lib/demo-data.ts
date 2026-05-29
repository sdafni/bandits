import type { Database, InsuranceEligibilityStatus, TenantCheckStatus } from "@/lib/database.types";
import { env } from "@/lib/env";
import { isProductionDeployment } from "@/lib/production-mode";

type TenantCheckListItem = Database["public"]["Tables"]["tenant_checks"]["Row"] & {
  properties: Database["public"]["Tables"]["properties"]["Row"] | null;
  ai_reports: Pick<
    Database["public"]["Tables"]["ai_reports"]["Row"],
    "score" | "recommendation" | "summary" | "created_at"
  > | null;
  tenant_documents: Pick<Database["public"]["Tables"]["tenant_documents"]["Row"], "id">[];
};

type TenantCheckDetail = Database["public"]["Tables"]["tenant_checks"]["Row"] & {
  properties: Database["public"]["Tables"]["properties"]["Row"] | null;
  tenant_documents: Database["public"]["Tables"]["tenant_documents"]["Row"][];
  tenant_public_profiles: Database["public"]["Tables"]["tenant_public_profiles"]["Row"] | null;
  ai_reports: Database["public"]["Tables"]["ai_reports"]["Row"] | null;
};

type PublicCheckDetail = Omit<TenantCheckDetail, "ai_reports"> & {
  landlord: Pick<Database["public"]["Tables"]["users"]["Row"], "full_name" | "company_name"> | null;
};

type ProtectionSnapshot = {
  depositQuote: Database["public"]["Tables"]["deposit_protection_quotes"]["Row"] | null;
  insuranceEligibility: Database["public"]["Tables"]["insurance_eligibility"]["Row"] | null;
  protectionOptions: Array<
    Database["public"]["Tables"]["tenant_check_protection_options"]["Row"] & {
      protection_packages: Database["public"]["Tables"]["protection_packages"]["Row"] | null;
    }
  >;
};

type DemoCase = {
  id: string;
  label: string;
  uploadToken: string;
  detail: TenantCheckDetail;
  protection: ProtectionSnapshot;
};

type DemoAnalytics = {
  activeCases: string;
  averageRiskScore: string;
  awaitingReview: string;
  pendingDocuments: string;
  protectedRentals: string;
  protectionEligibilityRate: string;
};

type DemoProtectionCard = {
  description: string;
  estimatedPrice: string;
  name: string;
  summary: string;
};

const NOW = new Date("2026-05-26T10:00:00.000Z");

const demoLandlords = [
  {
    company_name: "Aegean Living Partners",
    created_at: isoDaysAgo(240),
    email: "demo.landlord@safekey.gr",
    full_name: "Nikos Delis",
    id: "demo-landlord-01",
    role: "landlord" as const,
    updated_at: isoDaysAgo(6),
  },
  {
    company_name: "BlueHarbor Property Group",
    created_at: isoDaysAgo(210),
    email: "insurance.partner@safekey.gr",
    full_name: "Elena Kostaki",
    id: "demo-landlord-02",
    role: "landlord" as const,
    updated_at: isoDaysAgo(4),
  },
];

const demoProtectionCards: DemoProtectionCard[] = [
  {
    description:
      "Insurance-backed alternative to a traditional security deposit, designed as a partner-ready protection structure for future SafeKey distribution.",
    estimatedPrice: "€29/month",
    name: "Deposit Protection",
    summary: "For qualified tenants who want a lower upfront move-in cost while keeping landlord protection in place.",
  },
  {
    description:
      "Placeholder rental protection package linked to tenant screening, affordability, and income stability signals.",
    estimatedPrice: "€39/month",
    name: "Rent Protection",
    summary: "Focused on unpaid rent scenarios where screening results support a lower protection risk profile.",
  },
  {
    description:
      "Flagship package combining screening, rent protection, deposit protection, and recovery support into one trust layer.",
    estimatedPrice: "€69/month",
    name: "Full Rental Shield",
    summary: "Best presented for the strongest tenant profiles with clean documentation and high confidence signals.",
  },
];

const demoCases: DemoCase[] = [
  buildDemoCase({
    aiReport: {
      missing_documents: [],
      recommendation: "approve",
      reasoning: {
        debtToIncomeRatio: 0.28,
        documentCompleteness: 100,
        employmentResidencyConfidence: 91,
        extractedSignals: [],
        identityConfidence: 94,
        incomeStability: 89,
        missingDocumentCount: 0,
        rentAffordability: 92,
        reviewNotes: ["Stable salaried employment.", "Clean document set.", "Strong residency evidence."],
      },
      red_flags: [],
      score: 91,
      strengths: [
        "All requested documents were submitted.",
        "Income appears comfortably above monthly rent.",
        "Reference status is supportive.",
      ],
      summary:
        "Low-risk applicant with strong affordability, complete documents, and a clean verification file ready for protection packaging.",
    },
    caseId: "demo-approved-tenant",
    createdOffsetDays: 16,
    currentAddress: "16 Spefsippou, Kolonaki, Athens",
    depositFee: 29,
    descriptionLabel: "Approved tenant",
    eligibilityReason:
      "This tenant meets the screening and affordability thresholds for partner-ready protection packaging.",
    eligibilityStatus: "eligible",
    employmentStatus: "full_time",
    employerName: "Hellenic Shipping Group",
    missingRequirements: [],
    packageStatuses: {
      "Deposit Protection": "eligible",
      "Full Rental Shield": "eligible",
      "Rent Protection": "eligible",
    },
    property: {
      address_line1: "24 Tsakalof Street",
      city: "Athens",
      monthly_rent: 1350,
      name: "Kolonaki Executive Apartment",
      postal_code: "10673",
    },
    protectionRecommendation: "Full Rental Shield",
    rentAmount: 1350,
    tenant: {
      email: "maria.approved.demo@safekey.gr",
      full_name: "Maria Papadopoulou",
      monthly_income: 4800,
      phone: "+30 698 100 1001",
    },
    uploadToken: "demo-approved-token",
  }),
  buildDemoCase({
    aiReport: {
      missing_documents: ["bank_statement", "rental_reference"],
      recommendation: "conditional",
      reasoning: {
        debtToIncomeRatio: 0.41,
        documentCompleteness: 72,
        employmentResidencyConfidence: 71,
        extractedSignals: ["late payment"],
        identityConfidence: 86,
        incomeStability: 68,
        missingDocumentCount: 2,
        rentAffordability: 69,
        reviewNotes: [
          "Income is workable but not strong.",
          "Further reference validation recommended.",
          "Protection review should remain conditional.",
        ],
      },
      red_flags: [
        "Additional supporting evidence is still required for a stronger protection match.",
        "Reference quality should be manually reviewed.",
      ],
      score: 67,
      strengths: ["Identity pack is present.", "Employment information is available."],
      summary:
        "Conditionally acceptable tenant with moderate affordability and a partially complete file. Suitable for selective protection review after more documents arrive.",
    },
    caseId: "demo-conditional-tenant",
    createdOffsetDays: 11,
    currentAddress: "38 Ippokratous, Exarchia, Athens",
    depositFee: null,
    descriptionLabel: "Conditional tenant",
    eligibilityReason:
      "This tenant may qualify for selected partner products, but additional screening evidence is still required for a stronger protection position.",
    eligibilityStatus: "conditionally_eligible",
    employmentStatus: "self_employed",
    employerName: "Independent design consultant",
    missingRequirements: [
      "Recent bank statement still required.",
      "Previous landlord reference should be completed before final protection packaging.",
    ],
    packageStatuses: {
      "Deposit Protection": "conditionally_eligible",
      "Full Rental Shield": "not_eligible",
      "Rent Protection": "conditionally_eligible",
    },
    property: {
      address_line1: "18 Fokionos Negri",
      city: "Athens",
      monthly_rent: 980,
      name: "Kypseli Renovated Flat",
      postal_code: "11361",
    },
    protectionRecommendation: "Rent Protection",
    rentAmount: 980,
    tenant: {
      email: "giannis.conditional.demo@safekey.gr",
      full_name: "Giannis Markou",
      monthly_income: 2400,
      phone: "+30 698 100 1002",
    },
    uploadToken: "demo-conditional-token",
  }),
  buildDemoCase({
    aiReport: {
      missing_documents: ["proof_of_income", "employment_letter", "bank_statement"],
      recommendation: "decline",
      reasoning: {
        debtToIncomeRatio: 0.61,
        documentCompleteness: 48,
        employmentResidencyConfidence: 44,
        extractedSignals: ["arrears", "debt", "court"],
        identityConfidence: 72,
        incomeStability: 38,
        missingDocumentCount: 3,
        rentAffordability: 34,
        reviewNotes: [
          "Affordability is weak for the requested rent.",
          "File contains multiple risk terms requiring caution.",
          "Protection packaging should not proceed.",
        ],
      },
      red_flags: [
        "Potential arrears and debt indicators appear in the submitted evidence.",
        "Income stability remains unclear.",
        "Critical financial documents are missing.",
      ],
      score: 38,
      strengths: ["Basic identity documentation was submitted."],
      summary:
        "High-risk applicant with weak affordability, missing core financial evidence, and multiple red-flag indicators. Not suitable for partner protection packaging.",
    },
    caseId: "demo-high-risk-tenant",
    createdOffsetDays: 8,
    currentAddress: "7 Patision, Athens",
    depositFee: null,
    descriptionLabel: "High-risk tenant",
    eligibilityReason:
      "The current file sits outside the present protection appetite because affordability is weak, critical documents are missing, and multiple risk indicators remain unresolved.",
    eligibilityStatus: "not_eligible",
    employmentStatus: "temporary_contract",
    employerName: "Seasonal hospitality contract",
    missingRequirements: [
      "Core income evidence is missing.",
      "Residency certainty requires further verification.",
      "Risk flags should be escalated before any partner review.",
    ],
    packageStatuses: {
      "Deposit Protection": "not_eligible",
      "Full Rental Shield": "not_eligible",
      "Rent Protection": "not_eligible",
    },
    property: {
      address_line1: "9 Seaside Avenue",
      city: "Piraeus",
      monthly_rent: 1250,
      name: "Piraeus Marina Loft",
      postal_code: "18533",
    },
    protectionRecommendation: null,
    rentAmount: 1250,
    tenant: {
      email: "alex.highrisk.demo@safekey.gr",
      full_name: "Alex Johnson",
      monthly_income: 2050,
      phone: "+30 698 100 1003",
    },
    uploadToken: "demo-high-risk-token",
  }),
  buildDemoCase({
    caseId: "demo-expat-pending",
    createdOffsetDays: 2,
    currentAddress: "Currently in Berlin, relocating to Greece",
    depositFee: null,
    descriptionLabel: "Expat applicant — awaiting upload",
    eligibilityReason: "Screening has not started because the tenant upload pack is still outstanding.",
    eligibilityStatus: "pending_more_documents",
    employmentStatus: "full_time",
    employerName: "Remote SaaS employer (EU)",
    missingRequirements: ["Government ID", "Proof of income", "Employment letter", "Bank statement"],
    packageStatuses: {
      "Deposit Protection": "pending_more_documents",
      "Full Rental Shield": "pending_more_documents",
      "Rent Protection": "pending_more_documents",
    },
    property: {
      address_line1: "4 Eleftheriou Venizelou",
      city: "Chania",
      monthly_rent: 1100,
      name: "Old Town Expat Flat",
      postal_code: "73100",
    },
    protectionRecommendation: null,
    rentAmount: 1100,
    status: "pending_upload",
    tenant: {
      email: "sophie.expat.demo@safekey.gr",
      full_name: "Sophie Weber",
      monthly_income: 4200,
      phone: "+49 151 200 3301",
    },
    uploadToken: "demo-expat-pending-token",
  }),
  buildDemoCase({
    aiReport: null,
    caseId: "demo-documents-received",
    createdOffsetDays: 5,
    currentAddress: "12 Vasilissis Sofias, Athens",
    depositFee: null,
    descriptionLabel: "Documents received — analyst queue",
    eligibilityReason: "Core documents are in place and the case is ready for analyst review.",
    eligibilityStatus: "pending_more_documents",
    employmentStatus: "full_time",
    employerName: "Athens Legal Services",
    missingRequirements: ["Employment letter still pending final signature."],
    packageStatuses: {
      "Deposit Protection": "pending_more_documents",
      "Full Rental Shield": "pending_more_documents",
      "Rent Protection": "pending_more_documents",
    },
    property: {
      address_line1: "3 Panepistimiou",
      city: "Athens",
      monthly_rent: 1450,
      name: "Syntagma Professional Flat",
      postal_code: "10564",
    },
    protectionRecommendation: null,
    rentAmount: 1450,
    status: "documents_received",
    tenant: {
      email: "dimitra.pipeline.demo@safekey.gr",
      full_name: "Dimitra Nikolaidou",
      monthly_income: 3900,
      phone: "+30 698 100 1004",
    },
    uploadToken: "demo-documents-received-token",
  }),
  buildDemoCase({
    aiReport: null,
    caseId: "demo-under-review",
    createdOffsetDays: 7,
    currentAddress: "55 Poseidonos Avenue, Glyfada",
    depositFee: null,
    descriptionLabel: "Under analyst review",
    eligibilityReason: "Analyst review is in progress before the final recommendation is published.",
    eligibilityStatus: "pending_more_documents",
    employmentStatus: "self_employed",
    employerName: "Independent hospitality consultant",
    missingRequirements: ["Final reference confirmation pending."],
    packageStatuses: {
      "Deposit Protection": "pending_more_documents",
      "Full Rental Shield": "pending_more_documents",
      "Rent Protection": "pending_more_documents",
    },
    property: {
      address_line1: "55 Poseidonos Avenue",
      city: "Glyfada",
      monthly_rent: 1680,
      name: "Coastal Glyfada Apartment",
      postal_code: "16674",
    },
    protectionRecommendation: null,
    rentAmount: 1680,
    status: "under_review",
    tenant: {
      email: "petros.review.demo@safekey.gr",
      full_name: "Petros Angelopoulos",
      monthly_income: 5100,
      phone: "+30 698 100 1005",
    },
    uploadToken: "demo-under-review-token",
  }),
];

const demoCaseMap = new Map(demoCases.map((item) => [item.id, item]));
const demoTokenMap = new Map(demoCases.map((item) => [item.uploadToken, item]));

export function getDemoLandlordChecks(): TenantCheckListItem[] {
  return demoCases.map((item) => toListItem(item.detail));
}

export function getDemoAdminChecks(): TenantCheckListItem[] {
  return getDemoLandlordChecks();
}

export function getDemoLandlordCheckDetail(checkId: string): TenantCheckDetail | null {
  return demoCaseMap.get(checkId)?.detail ?? null;
}

export function getDemoAdminCheckDetail(checkId: string): TenantCheckDetail | null {
  return getDemoLandlordCheckDetail(checkId);
}

export function getDemoPublicCheckByToken(token: string): PublicCheckDetail | null {
  const item = demoTokenMap.get(token);

  if (!item) {
    return null;
  }

  const { ai_reports: _report, ...detail } = item.detail;
  const landlord = demoLandlords.find((entry) => entry.id === detail.landlord_id) ?? demoLandlords[0];

  return {
    ...detail,
    landlord: {
      company_name: landlord.company_name,
      full_name: landlord.full_name,
    },
  };
}

export function getDemoProtectionSnapshot(checkId: string): ProtectionSnapshot | null {
  return demoCaseMap.get(checkId)?.protection ?? null;
}

export function getDemoCasePresentationCards() {
  return demoCases.map((item) => ({
    eligibilityStatus: item.protection.insuranceEligibility?.status ?? "pending_more_documents",
    id: item.id,
    label: item.label,
    protectionPackage: item.protection.insuranceEligibility?.recommended_package ?? "Pending package review",
    recommendation: item.detail.ai_reports?.recommendation ?? "conditional",
    riskScore: item.detail.ai_reports?.score ?? 0,
    status: item.detail.status,
    tenantName: item.detail.tenant_full_name,
    uploadToken: item.uploadToken,
  }));
}

export function getDemoDashboardAnalytics(): DemoAnalytics {
  const cases = demoCases.map((item) => item.detail);
  const completed = cases.filter((item) => item.status === "report_ready" && item.ai_reports);
  const averageRiskScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((total, item) => total + (item.ai_reports?.score ?? 0), 0) / completed.length,
        )
      : 0;
  const eligible = demoCases.filter(
    (item) =>
      item.protection.insuranceEligibility?.status === "eligible" ||
      item.protection.insuranceEligibility?.status === "conditionally_eligible",
  ).length;

  return {
    activeCases: String(cases.length),
    averageRiskScore: String(averageRiskScore),
    awaitingReview: String(cases.filter((item) => item.status === "under_review").length),
    pendingDocuments: String(
      cases.filter((item) => item.status === "pending_upload" || item.status === "documents_received").length,
    ),
    protectedRentals: String(eligible),
    protectionEligibilityRate: `${Math.round((eligible / Math.max(cases.length, 1)) * 100)}%`,
  };
}

export function shouldIncludeDemoCasesInWorkspace() {
  return !isProductionDeployment();
}

/** Badge label for curated sample rows (never "Demo" in the product UI). */
export function getCaseOriginBadgeLabel(checkId: string) {
  if (!isDemoCheckId(checkId)) {
    return null;
  }

  if (isProductionDeployment()) {
    return null;
  }

  return "Sample Case";
}

export function mergeLandlordChecksWithDemo(liveChecks: TenantCheckListItem[]) {
  if (!shouldIncludeDemoCasesInWorkspace()) {
    return [...liveChecks].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }

  const liveIds = new Set(liveChecks.map((check) => check.id));
  const merged = [...liveChecks, ...getDemoLandlordChecks().filter((check) => !liveIds.has(check.id))];

  return merged.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export function mergeAdminChecksWithDemo(liveChecks: TenantCheckListItem[]) {
  return mergeLandlordChecksWithDemo(liveChecks);
}

export type DemoPaymentRecord = {
  amount: string;
  createdAt: string;
  id: string;
  label: string;
  status: "paid" | "failed" | "open";
  type: "subscription" | "screening";
};

export function getDemoPaymentHistory(): DemoPaymentRecord[] {
  return [
    {
      amount: "€89.00",
      createdAt: isoDaysAgo(12),
      id: "demo-payment-sub-pro",
      label: "Pro plan subscription",
      status: "paid",
      type: "subscription",
    },
    {
      amount: "€39.00",
      createdAt: isoDaysAgo(16),
      id: "demo-payment-screening-approved",
      label: "One-time screening — Maria Papadopoulou",
      status: "paid",
      type: "screening",
    },
    {
      amount: "€39.00",
      createdAt: isoDaysAgo(8),
      id: "demo-payment-screening-failed",
      label: "One-time screening — Alex Johnson",
      status: "failed",
      type: "screening",
    },
    {
      amount: "€89.00",
      createdAt: isoDaysAgo(1),
      id: "demo-payment-invoice-open",
      label: "Pro plan renewal invoice",
      status: "open",
      type: "subscription",
    },
  ];
}

export function getDemoWalkthroughSteps() {
  return [
    {
      description: "Create a tenant check, choose documents, and issue the secure upload link.",
      href: "/dashboard",
      step: "01",
      title: "Landlord opens a case",
    },
    {
      description: "Tenant submits identity, income, and residency evidence through a private upload page.",
      href: "/upload/demo-documents-received-token",
      step: "02",
      title: "Tenant upload flow",
    },
    {
      description: "Analyst reviews files, protection signals, and publishes the structured recommendation.",
      href: "/admin/review/demo-conditional-tenant",
      step: "03",
      title: "Admin review desk",
    },
    {
      description: "Risk score, red flags, and approve / conditional / decline output for the landlord.",
      href: "/dashboard/checks/demo-approved-tenant",
      step: "04",
      title: "AI screening report",
    },
    {
      description: "Subscription or per-case screening unlocks report generation and protection packaging.",
      href: "/dashboard/billing",
      step: "05",
      title: "Billing and entitlements",
    },
    {
      description: "Approved, conditional, and declined outcomes with protection eligibility states.",
      href: "/demo",
      step: "06",
      title: "Decision outcomes",
    },
  ] as const;
}

export function getDemoLandlords() {
  return demoLandlords;
}

export function getDemoProtectionCards() {
  return demoProtectionCards;
}

export function isDemoCheckId(checkId: string) {
  return demoCaseMap.has(checkId);
}

export function isDemoUploadToken(token: string) {
  return demoTokenMap.has(token);
}

export function getDemoRouteExamples() {
  return {
    adminApproved: "/admin/review/demo-approved-tenant",
    adminConditional: "/admin/review/demo-conditional-tenant",
    adminHighRisk: "/admin/review/demo-high-risk-tenant",
    adminUnderReview: "/admin/review/demo-under-review",
    landlordApproved: "/dashboard/checks/demo-approved-tenant",
    landlordConditional: "/dashboard/checks/demo-conditional-tenant",
    landlordHighRisk: "/dashboard/checks/demo-high-risk-tenant",
    landlordPending: "/dashboard/checks/demo-expat-pending",
    uploadApproved: "/upload/demo-approved-token",
    uploadConditional: "/upload/demo-conditional-token",
    uploadHighRisk: "/upload/demo-high-risk-token",
    uploadPending: "/upload/demo-expat-pending-token",
    walkthrough: "/demo",
  };
}

function buildDemoCase(input: {
  aiReport?:
    | Omit<
        Database["public"]["Tables"]["ai_reports"]["Row"],
        "created_at" | "generated_by" | "id" | "tenant_check_id" | "updated_at"
      >
    | null;
  caseId: string;
  createdOffsetDays: number;
  currentAddress: string;
  depositFee: number | null;
  descriptionLabel: string;
  eligibilityReason: string;
  eligibilityStatus: InsuranceEligibilityStatus;
  employmentStatus: string;
  employerName: string;
  missingRequirements: string[];
  packageStatuses: Record<"Deposit Protection" | "Rent Protection" | "Full Rental Shield", InsuranceEligibilityStatus>;
  property: {
    address_line1: string;
    city: string;
    monthly_rent: number;
    name: string;
    postal_code: string;
  };
  protectionRecommendation: string | null;
  rentAmount: number;
  tenant: {
    email: string;
    full_name: string;
    monthly_income: number;
    phone: string;
  };
  status?: TenantCheckStatus;
  uploadToken: string;
}): DemoCase {
  const status = input.status ?? "report_ready";
  const createdAt = isoDaysAgo(input.createdOffsetDays);
  const reviewRequestedAt =
    status === "pending_upload" ? null : isoDaysAgo(Math.max(1, input.createdOffsetDays - 2));
  const reviewCompletedAt =
    status === "report_ready" ? isoDaysAgo(Math.max(1, input.createdOffsetDays - 1)) : null;
  const resolvedActivityAt = reviewCompletedAt ?? createdAt;
  const resolvedReviewRequestedAt = reviewRequestedAt ?? createdAt;
  const propertyId = `${input.caseId}-property`;
  const profileId = `${input.caseId}-profile`;
  const reportId = `${input.caseId}-report`;
  const eligibilityId = `${input.caseId}-eligibility`;
  const quoteId = `${input.caseId}-quote`;

  const property: Database["public"]["Tables"]["properties"]["Row"] = {
    address_line1: input.property.address_line1,
    city: input.property.city,
    created_at: createdAt,
    id: propertyId,
    landlord_id: demoLandlords[0].id,
    monthly_rent: input.property.monthly_rent,
    name: input.property.name,
    notes: null,
    postal_code: input.property.postal_code,
    updated_at: resolvedActivityAt,
  };

  const tenantProfile: Database["public"]["Tables"]["tenant_public_profiles"]["Row"] = {
    consent_confirmed: true,
    created_at: resolvedReviewRequestedAt,
    current_address: input.currentAddress,
    email: input.tenant.email,
    employer_name: input.employerName,
    employment_status: input.employmentStatus,
    full_name: input.tenant.full_name,
    id: profileId,
    monthly_income: input.tenant.monthly_income,
    monthly_rent: input.rentAmount,
    move_in_date: "2026-07-01",
    notes:
      "Applicant confirms move-in readiness and can provide further supporting material during the final review process.",
    phone: input.tenant.phone,
    tenant_check_id: input.caseId,
    updated_at: resolvedActivityAt,
  };

  const tenantDocuments = buildDemoDocumentsForStatus({
    caseId: input.caseId,
    createdOffsetDays: input.createdOffsetDays,
    status,
  });

  const aiReport: Database["public"]["Tables"]["ai_reports"]["Row"] | null =
    status === "report_ready" && input.aiReport
      ? {
          ...input.aiReport,
          created_at: reviewCompletedAt ?? createdAt,
          generated_by: "demo-seed",
          id: reportId,
          tenant_check_id: input.caseId,
          updated_at: reviewCompletedAt ?? createdAt,
        }
      : null;

  const tenantCheck: TenantCheckDetail = {
    ai_reports: aiReport,
    created_at: createdAt,
    id: input.caseId,
    landlord_id: demoLandlords[0].id,
    properties: property,
    property_id: propertyId,
    requested_documents: [
      "government_id",
      "proof_of_income",
      "employment_letter",
      "bank_statement",
      "rental_reference",
      "supporting_document",
    ],
    review_completed_at: reviewCompletedAt,
    review_requested_at: reviewRequestedAt,
    secure_upload_url: `http://localhost:3001/upload/${input.uploadToken}`,
    status: "report_ready",
    tenant_documents: tenantDocuments,
    tenant_email: input.tenant.email,
    tenant_full_name: input.tenant.full_name,
    tenant_phone: input.tenant.phone,
    tenant_public_profiles: tenantProfile,
    updated_at: resolvedActivityAt,
    upload_token_expires_at: isoDaysFromNow(10),
    upload_token_hash: `demo-hash-${input.caseId}`,
    workflow_activated_at: reviewRequestedAt ?? createdAt,
  };

  const protectionPackages = buildDemoProtectionPackages(input.caseId);
  const protectionOptionIds = {
    deposit: `${input.caseId}-protection-deposit`,
    full: `${input.caseId}-protection-full`,
    rent: `${input.caseId}-protection-rent`,
  };

  return {
    detail: tenantCheck,
    id: input.caseId,
    label: input.descriptionLabel,
    protection: {
      depositQuote: {
        coverage_amount: input.rentAmount * 2,
        created_at: resolvedActivityAt,
        id: quoteId,
        landlord_id: demoLandlords[0].id,
        proposed_protection_fee: input.depositFee,
        rent_amount: input.rentAmount,
        status:
          input.eligibilityStatus === "eligible"
            ? "indicative_quote_ready"
            : input.eligibilityStatus === "conditionally_eligible"
              ? "needs_more_documents"
              : "not_available",
        tenant_check_id: input.caseId,
        tenant_id: profileId,
        traditional_deposit_amount: input.rentAmount * 2,
      },
      insuranceEligibility: {
        created_at: resolvedActivityAt,
        eligibility_reason: input.eligibilityReason,
        id: eligibilityId,
        manual_override_note:
          input.caseId === "demo-conditional-tenant"
            ? "Manual note: keep conditionally eligible until the bank statement and reference are added."
            : null,
        missing_requirements: input.missingRequirements,
        recommended_package: input.protectionRecommendation,
        review_source: input.caseId === "demo-conditional-tenant" ? "admin_override" : "system",
        risk_score: input.aiReport?.score ?? 0,
        status: input.eligibilityStatus,
        tenant_check_id: input.caseId,
        updated_at: resolvedActivityAt,
      },
      protectionOptions: [
        {
          created_at: resolvedActivityAt,
          eligibility_status: input.packageStatuses["Deposit Protection"],
          id: protectionOptionIds.deposit,
          package_id: protectionPackages.deposit.id,
          protection_packages: protectionPackages.deposit,
          recommendation_reason:
            input.packageStatuses["Deposit Protection"] === "eligible"
              ? "Indicative fit for a deposit alternative presentation."
              : input.packageStatuses["Deposit Protection"] === "conditionally_eligible"
                ? "Possible fit after more documentation."
                : "Not suitable for a deposit alternative under the current risk profile.",
          tenant_check_id: input.caseId,
        },
        {
          created_at: resolvedActivityAt,
          eligibility_status: input.packageStatuses["Rent Protection"],
          id: protectionOptionIds.rent,
          package_id: protectionPackages.rent.id,
          protection_packages: protectionPackages.rent,
          recommendation_reason:
            input.packageStatuses["Rent Protection"] === "eligible"
              ? "Recommended where rent affordability and income coverage are strong."
              : input.packageStatuses["Rent Protection"] === "conditionally_eligible"
                ? "Potential fit pending stronger financial support."
                : "Current signals are outside the current rent protection appetite.",
          tenant_check_id: input.caseId,
        },
        {
          created_at: resolvedActivityAt,
          eligibility_status: input.packageStatuses["Full Rental Shield"],
          id: protectionOptionIds.full,
          package_id: protectionPackages.full.id,
          protection_packages: protectionPackages.full,
          recommendation_reason:
            input.packageStatuses["Full Rental Shield"] === "eligible"
              ? "Strongest candidate for a full partner-ready protection bundle."
              : input.packageStatuses["Full Rental Shield"] === "conditionally_eligible"
                ? "Could be presented after partner review."
                : "Reserved for cleaner files with lower overall risk exposure.",
          tenant_check_id: input.caseId,
        },
      ],
    },
    uploadToken: input.uploadToken,
  };
}

function buildDemoProtectionPackages(caseId: string) {
  return {
    deposit: buildProtectionPackage({
      caseId,
      description:
        "Insurance-backed deposit alternative designed to replace a large upfront cash deposit with a partner-backed protection layer.",
      estimatedPrice: "€29/month",
      name: "Deposit Protection",
      type: "deposit-protection",
    }),
    full: buildProtectionPackage({
      caseId,
      description:
        "Flagship SafeKey package combining screening, deposit protection, rent protection, and recovery support.",
      estimatedPrice: "€69/month",
      name: "Full Rental Shield",
      type: "full-protection",
    }),
    rent: buildProtectionPackage({
      caseId,
      description:
        "Protection package focused on unpaid rent exposure for applicants whose affordability profile remains within the target range.",
      estimatedPrice: "€39/month",
      name: "Rent Protection",
      type: "rent-protection",
    }),
  };
}

function buildProtectionPackage(input: {
  caseId: string;
  description: string;
  estimatedPrice: string;
  name: string;
  type: Database["public"]["Tables"]["protection_packages"]["Row"]["type"];
}): Database["public"]["Tables"]["protection_packages"]["Row"] {
  return {
    coverage_items: [
      "Partner-ready underwriting workflow",
      "Eligibility linked to tenant screening signals",
      "Manual insurance review support",
    ],
    created_at: isoDaysAgo(60),
    description: input.description,
    estimated_price: input.estimatedPrice,
    id: `${input.caseId}-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    is_active: true,
    name: input.name,
    type: input.type,
    updated_at: isoDaysAgo(8),
  };
}

function buildDemoDocumentsForStatus(input: {
  caseId: string;
  createdOffsetDays: number;
  status: TenantCheckStatus;
}) {
  if (input.status === "pending_upload") {
    return [];
  }

  const baseDocuments: Database["public"]["Tables"]["tenant_documents"]["Row"][] = [
    buildDemoDocument({
      caseId: input.caseId,
      createdAt: isoDaysAgo(Math.max(1, input.createdOffsetDays - 3)),
      documentType: "government_id",
      extractedText:
        "Passport verified. Name matches tenant profile. Expiry valid. Residency document references Greece.",
      fileName: "passport-and-residency-pack.pdf",
    }),
    buildDemoDocument({
      caseId: input.caseId,
      createdAt: isoDaysAgo(Math.max(1, input.createdOffsetDays - 2)),
      documentType:
        input.caseId === "demo-high-risk-tenant" ? "supporting_document" : "proof_of_income",
      extractedText:
        input.caseId === "demo-high-risk-tenant"
          ? "Submitted supporting note with limited financial detail."
          : "Salary deposit and payroll evidence provided for the most recent month.",
      fileName:
        input.caseId === "demo-high-risk-tenant"
          ? "supporting-note.txt"
          : "income-verification-pack.pdf",
    }),
  ];

  if (input.status === "documents_received") {
    return baseDocuments;
  }

  const extendedDocuments = [
    ...baseDocuments,
    buildDemoDocument({
      caseId: input.caseId,
      createdAt: isoDaysAgo(Math.max(1, input.createdOffsetDays - 2)),
      documentType: "bank_statement",
      extractedText: "Bank statement confirms monthly income coverage against requested rent.",
      fileName: "bank-statement-recent.pdf",
    }),
    buildDemoDocument({
      caseId: input.caseId,
      createdAt: isoDaysAgo(Math.max(1, input.createdOffsetDays - 1)),
      documentType: "employment_letter",
      extractedText: "Employer letter confirms role, compensation band, and contract continuity.",
      fileName: "employment-letter.pdf",
    }),
  ];

  if (input.caseId === "demo-approved-tenant") {
    extendedDocuments.push(
      buildDemoDocument({
        caseId: input.caseId,
        createdAt: isoDaysAgo(Math.max(1, input.createdOffsetDays - 1)),
        documentType: "rental_reference",
        extractedText: "Previous landlord confirms timely rent payments and clean departure.",
        fileName: "landlord-reference-letter.pdf",
      }),
    );
  }

  return extendedDocuments;
}

function buildDemoDocument(input: {
  caseId: string;
  createdAt: string;
  documentType: string;
  extractedText: string;
  fileName: string;
}): Database["public"]["Tables"]["tenant_documents"]["Row"] {
  return {
    created_at: input.createdAt,
    document_type: input.documentType,
    extracted_text: input.extractedText,
    file_name: input.fileName,
    file_size: 182400,
    id: `${input.caseId}-${input.documentType}-${input.fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    mime_type: "application/pdf",
    storage_path: `demo/${input.caseId}/${input.fileName}`,
    tenant_check_id: input.caseId,
    updated_at: input.createdAt,
    upload_status: "reviewed",
    uploaded_by_email: "demo-upload@safekey.gr",
  };
}

function toListItem(detail: TenantCheckDetail): TenantCheckListItem {
  return {
    ...detail,
    ai_reports: detail.ai_reports
      ? {
          created_at: detail.ai_reports.created_at,
          recommendation: detail.ai_reports.recommendation,
          score: detail.ai_reports.score,
          summary: detail.ai_reports.summary,
        }
      : null,
    tenant_documents: detail.tenant_documents.map((item) => ({ id: item.id })),
  };
}

function isoDaysAgo(days: number) {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function isoDaysFromNow(days: number) {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
