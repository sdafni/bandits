import {
  getBillingPlanLimits,
  isEntitledSubscriptionStatus,
  type BillingPlanKey,
  type BillingPlanLimits,
} from "@/lib/billing";
import type { GateEvaluationMap } from "@/lib/monetization";
import {
  DEFAULT_MONETIZATION_CONFIG,
  evaluateAllMonetizationGates,
  type MonetizationConfig,
  type MonetizationEntitlements,
} from "@/lib/monetization";
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

const CAPABILITY_GATE_MAP: Partial<Record<WorkspaceCapability, keyof GateEvaluationMap>> = {
  send_upload_link: "create_upload_link",
  receive_tenant_uploads: "tenant_upload",
  view_live_upload_link: "create_upload_link",
  export_trust_report: "view_report",
  generate_ai_report: "run_analysis",
  finalize_screening: "view_report",
};

export type WorkspaceAccessContext = {
  mode: WorkspaceMode;
  planKey: BillingPlanKey | null;
  limits: BillingPlanLimits;
  hasActiveSubscription: boolean;
  screeningCredits: number;
  /** Resolved billing gates for this workspace (landlord-level, no check id). */
  gates: GateEvaluationMap;
};

export type CaseAccessContext = WorkspaceAccessContext & {
  checkId: string;
  status: TenantCheckStatus;
  workflowActivatedAt: string | null;
  /** @deprecated Use gates — kept for transitional call sites. */
  hasCaseBillingAccess: boolean;
  isDraft: boolean;
  isWorkflowActive: boolean;
};

export function resolveWorkspaceAccess(
  overview: Pick<BillingOverview, "activeSubscription" | "screeningCredits">,
  funnel?: {
    config: MonetizationConfig;
    entitlements: MonetizationEntitlements;
  },
): WorkspaceAccessContext {
  const planKey = (overview.activeSubscription?.plan_key as BillingPlanKey | null) ?? null;
  const hasActiveSubscription = Boolean(
    overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status),
  );

  const gates =
    funnel != null
      ? evaluateAllMonetizationGates(funnel.config, funnel.entitlements)
      : evaluateAllMonetizationGates(DEFAULT_MONETIZATION_CONFIG, {
          hasActiveSubscription,
          hasPerCheckPayment: overview.screeningCredits > 0,
          hasReportUnlockPayment: overview.screeningCredits > 0,
        });

  return {
    hasActiveSubscription,
    limits: getBillingPlanLimits(planKey),
    mode: hasActiveSubscription ? "subscribed" : "preview",
    planKey,
    screeningCredits: overview.screeningCredits,
    gates,
  };
}

export function resolveCaseAccess(params: {
  workspace: WorkspaceAccessContext;
  checkId: string;
  status: string;
  workflowActivatedAt: string | null;
  hasCaseBillingAccess: boolean;
  caseGates?: GateEvaluationMap;
}): CaseAccessContext {
  const status = params.status as TenantCheckStatus;
  const isDraft = status === "draft" || !params.workflowActivatedAt;
  const isWorkflowActive = !isDraft && Boolean(params.workflowActivatedAt);
  const gates = params.caseGates ?? params.workspace.gates;

  return {
    ...params.workspace,
    checkId: params.checkId,
    gates,
    hasCaseBillingAccess: params.hasCaseBillingAccess,
    isDraft,
    isWorkflowActive,
    status,
    workflowActivatedAt: params.workflowActivatedAt,
  };
}

function isGateOpenForCapability(access: WorkspaceAccessContext | CaseAccessContext, capability: WorkspaceCapability) {
  const gateKey = CAPABILITY_GATE_MAP[capability];
  if (!gateKey) {
    return true;
  }

  return access.gates[gateKey];
}

export function canUseCapability(
  access: WorkspaceAccessContext | CaseAccessContext,
  capability: WorkspaceCapability,
): boolean {
  if (!isGateOpenForCapability(access, capability)) {
    return false;
  }

  if ("isDraft" in access) {
    const caseAccess = access as CaseAccessContext;

    switch (capability) {
      case "send_upload_link":
        return true;
      case "view_live_upload_link":
        return caseAccess.isWorkflowActive;
      case "receive_tenant_uploads":
        return caseAccess.isWorkflowActive;
      case "export_trust_report":
      case "generate_ai_report":
      case "finalize_screening":
        return caseAccess.isWorkflowActive;
      default:
        return true;
    }
  }

  return true;
}

export function isDraftCheck(status: string, workflowActivatedAt: string | null) {
  return status === "draft" || !workflowActivatedAt;
}
