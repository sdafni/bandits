/**
 * Role architecture for current MVP and planned V2 expansion.
 * Database currently stores `landlord` and `admin`; agency/property-manager
 * accounts are represented as future-ready workspace scopes.
 */

export const WORKSPACE_ROLES = ["landlord", "admin"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PLANNED_ACCOUNT_TYPES = [
  "individual_landlord",
  "property_manager",
  "agency",
  "insurance_partner",
] as const;

export type PlannedAccountType = (typeof PLANNED_ACCOUNT_TYPES)[number];

export const ROLE_CAPABILITIES = {
  admin: [
    "review_all_cases",
    "override_protection",
    "publish_reports",
    "view_billing_signals",
  ],
  landlord: [
    "create_cases",
    "issue_upload_links",
    "view_own_reports",
    "manage_billing",
  ],
} as const;

export const V2_WORKSPACE_FEATURES = {
  agency: ["multi_landlord_portfolio", "shared_analyst_queue", "white_label_upload"],
  property_manager: ["multi_property_structure", "team_permissions", "portfolio_analytics"],
} as const;
