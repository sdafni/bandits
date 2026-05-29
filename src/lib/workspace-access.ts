import {
  getBillingPlanLimits,
  isEntitledSubscriptionStatus,
  type BillingPlanKey,
  type BillingPlanLimits,
} from "@/lib/billing";
import type { BillingOverview } from "@/lib/billing-queries";

export type WorkspaceMode = "preview" | "subscribed";

export type TenantCheckStatus =
  | "draft"
  | "pending_upload"
  | "documents_received"
  | "under_review"
  | "report_ready";

export type WorkspaceCapability =
  | "explore_dashboard"
  | "create_draft_screening"
  | "edit_draft_screening"
  | "send_upload_link"
  | "receive_tenant_uploads"
  | "view_live_upload_link"
  | "export_trust_report"
  | "generate_ai_report"
  | "finalize_screening";

export const PLAN_CAPABILITY_MATRIX: Record<WorkspaceMode, Record<WorkspaceCapability, boolean>> = {
  preview: {
    explore_dashboard: true,
    create_draft_screening: true,
    edit_draft_screening: true,
    send_upload_link: false,
    receive_tenant_uploads: false,
    view_live_upload_link: false,
    export_trust_report: false,
    generate_ai_report: false,
    finalize_screening: false,
  },
  subscribed: {
    explore_dashboard: true,
    create_draft_screening: true,
    edit_draft_screening: true,
    send_upload_link: true,
    receive_tenant_uploads: true,
    view_live_upload_link: true,
    export_trust_report: true,
    generate_ai_report: true,
    finalize_screening: true,
  },
};

export type WorkspaceAccessContext = {
  mode: WorkspaceMode;
  planKey: BillingPlanKey | null;
  limits: BillingPlanLimits;
  hasActiveSubscription: boolean;
  screeningCredits: number;
};

export type CaseAccessContext = WorkspaceAccessContext & {
  checkId: string;
  status: TenantCheckStatus;
  workflowActivatedAt: string | null;
  hasCaseBillingAccess: boolean;
  isDraft: boolean;
  isWorkflowActive: boolean;
};

export function resolveWorkspaceAccess(overview: Pick<BillingOverview, "activeSubscription" | "screeningCredits">): WorkspaceAccessContext {
  const planKey = (overview.activeSubscription?.plan_key as BillingPlanKey | null) ?? null;
  const hasActiveSubscription = Boolean(
    overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status),
  );

  return {
    hasActiveSubscription,
    limits: getBillingPlanLimits(planKey),
    mode: hasActiveSubscription ? "subscribed" : "preview",
    planKey,
    screeningCredits: overview.screeningCredits,
  };
}

export function resolveCaseAccess(params: {
  workspace: WorkspaceAccessContext;
  checkId: string;
  status: string;
  workflowActivatedAt: string | null;
  hasCaseBillingAccess: boolean;
}): CaseAccessContext {
  const status = params.status as TenantCheckStatus;
  const isDraft = status === "draft" || !params.workflowActivatedAt;
  const isWorkflowActive = !isDraft && Boolean(params.workflowActivatedAt);
  const entitled = params.workspace.mode === "subscribed" || params.hasCaseBillingAccess;

  return {
    ...params.workspace,
    checkId: params.checkId,
    hasCaseBillingAccess: params.hasCaseBillingAccess,
    isDraft,
    isWorkflowActive,
    status,
    workflowActivatedAt: params.workflowActivatedAt,
  };
}

export function canUseCapability(
  access: WorkspaceAccessContext | CaseAccessContext,
  capability: WorkspaceCapability,
): boolean {
  const matrix = PLAN_CAPABILITY_MATRIX[access.mode];
  if (!matrix[capability]) {
    return false;
  }

  if ("isDraft" in access) {
    const caseAccess = access as CaseAccessContext;
    const entitled = caseAccess.mode === "subscribed" || caseAccess.hasCaseBillingAccess;

    switch (capability) {
      case "send_upload_link":
        return entitled;
      case "view_live_upload_link":
        return entitled && caseAccess.isWorkflowActive;
      case "receive_tenant_uploads":
        return entitled && caseAccess.isWorkflowActive;
      case "export_trust_report":
      case "generate_ai_report":
      case "finalize_screening":
        return entitled && caseAccess.isWorkflowActive;
      default:
        return true;
    }
  }

  return true;
}

export function isDraftCheck(status: string, workflowActivatedAt: string | null) {
  return status === "draft" || !workflowActivatedAt;
}
