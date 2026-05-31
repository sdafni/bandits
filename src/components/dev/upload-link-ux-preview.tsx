"use client";

import { useState } from "react";
import { TenantCheckCreatedSuccess } from "@/components/tenant-check-created-success";
import { PlanRequiredModal } from "@/components/plan-required-modal";
import type { MonetizationPermissionsSnapshot } from "@/lib/monetization";

const BASE_PERMISSIONS: MonetizationPermissionsSnapshot = {
  billingNavEnabled: true,
  canCreateUploadLink: false,
  canRunAnalysis: false,
  canViewFullReport: false,
  createUploadLinkBlockReason: "plan_required",
  monetizationMode: "PREPAY",
  reportUnlockPriceCents: 1900,
  shouldPromptPlanBeforeUploadLink: true,
  viewFullReportBlockReason: "plan_required",
};

const PERMISSIONS_WITH_PLAN: MonetizationPermissionsSnapshot = {
  ...BASE_PERMISSIONS,
  canCreateUploadLink: true,
  canRunAnalysis: true,
  canViewFullReport: true,
  createUploadLinkBlockReason: null,
  shouldPromptPlanBeforeUploadLink: false,
  viewFullReportBlockReason: null,
};

const PERMISSIONS_NO_PLAN: MonetizationPermissionsSnapshot = {
  ...BASE_PERMISSIONS,
};

const SAMPLE_URL = "https://getsafekey.app/upload/demo-ux-preview-token";

export function UploadLinkUxPreview({
  state,
}: {
  state: "no-plan" | "with-plan" | "modal" | "link-ready";
}) {
  const [modalOpen, setModalOpen] = useState(state === "modal");

  if (state === "modal") {
    return (
      <div className="relative min-h-[640px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <TenantCheckCreatedSuccess
          checkId="00000000-0000-4000-8000-000000000001"
          linkActive={false}
          monetizationPermissions={PERMISSIONS_NO_PLAN}
          onDone={() => undefined}
          propertyName="Kifisia Apartment"
          tenantEmail="tenant@example.com"
          tenantName="Maria Papadopoulou"
        />
        <PlanRequiredModal onClose={() => setModalOpen(false)} open={modalOpen} />
      </div>
    );
  }

  if (state === "link-ready") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <TenantCheckCreatedSuccess
          checkId="00000000-0000-4000-8000-000000000002"
          linkActive
          monetizationPermissions={PERMISSIONS_WITH_PLAN}
          onDone={() => undefined}
          propertyName="Kifisia Apartment"
          tenantEmail="tenant@example.com"
          tenantName="Maria Papadopoulou"
          uploadUrl={SAMPLE_URL}
        />
      </div>
    );
  }

  const permissions = state === "with-plan" ? PERMISSIONS_WITH_PLAN : PERMISSIONS_NO_PLAN;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <TenantCheckCreatedSuccess
        checkId="00000000-0000-4000-8000-000000000003"
        linkActive={false}
        monetizationPermissions={permissions}
        onDone={() => undefined}
        propertyName="Kifisia Apartment"
        tenantEmail="tenant@example.com"
        tenantName="Maria Papadopoulou"
      />
    </div>
  );
}
