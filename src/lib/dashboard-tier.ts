import type { BillingPlanKey, BillingPlanLimits } from "@/lib/billing";
import type { WorkspaceAccessContext } from "@/lib/workspace-access";

export type DashboardTier = "basic" | "pro" | "premium";

export type DashboardCheck = {
  id: string;
  status: "draft" | "pending_upload" | "documents_received" | "under_review" | "report_ready";
  workflow_activated_at?: string | null;
  created_at: string;
  review_completed_at?: string | null;
  review_requested_at?: string | null;
  requested_documents: string[];
  tenant_full_name: string;
  tenant_email: string | null;
  properties: {
    city: string | null;
    monthly_rent: number | null;
    name: string;
  } | null;
  ai_reports: {
    recommendation: "approve" | "conditional" | "decline";
    score: number;
    summary?: string;
  } | null;
  tenant_documents: Array<{ id: string }>;
  upload_token_expires_at?: string | null;
};

export type DashboardStats = {
  total: number;
  awaitingUpload: number;
  inReview: number;
  reportsReady: number;
  averageScore: number | null;
  elevatedRisk: number;
  activeOperational: number;
  completedThisMonth: number;
  limits: BillingPlanLimits;
};

export function resolveDashboardTier(access: Pick<WorkspaceAccessContext, "planKey" | "hasActiveSubscription">): DashboardTier {
  if (access.planKey === "premium" && access.hasActiveSubscription) {
    return "premium";
  }
  if (access.planKey === "pro" && access.hasActiveSubscription) {
    return "pro";
  }
  return "basic";
}

export function resolveDashboardExperience(planKey: BillingPlanKey | null): BillingPlanKey {
  return planKey ?? "basic";
}

/** Same calm dashboard for every plan — higher tiers unlock capacity, not extra widgets. */
export const DASHBOARD_TIER_FEATURES = {
  basic: {
    showActivitySummary: false,
    showAttentionList: false,
    showPropertyGroups: false,
    showStatusFilters: false,
    showRentLine: false,
    showPlanUsage: false,
    recentScreeningsLimit: null,
  },
  pro: {
    showActivitySummary: false,
    showAttentionList: false,
    showPropertyGroups: false,
    showStatusFilters: false,
    showRentLine: false,
    showPlanUsage: false,
    recentScreeningsLimit: null,
  },
  premium: {
    showActivitySummary: false,
    showAttentionList: false,
    showPropertyGroups: false,
    showStatusFilters: false,
    showRentLine: false,
    showPlanUsage: false,
    recentScreeningsLimit: null,
  },
} as const;
