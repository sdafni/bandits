"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { DashboardLandlordHeader } from "@/components/dashboard/dashboard-landlord-header";
import { DashboardPlanBanner } from "@/components/dashboard/dashboard-plan-banner";
import { DashboardWelcomeEmpty } from "@/components/dashboard/dashboard-welcome-empty";
import { DashboardToast } from "@/components/dashboard-toast";
import { LandlordWorkflowStrip } from "@/components/landlord-workflow-strip";
import { NewCheckFlow } from "@/components/new-check-flow";
import { TrustSignalsStrip } from "@/components/trust-signals-strip";
import { WorkspacePrimaryCta } from "@/components/workspace-primary-cta";
import { resolveDashboardExperience } from "@/lib/dashboard-tier";
import { useT } from "@/lib/i18n/context";
import type { WorkspaceAccessContext } from "@/lib/workspace-access";

export function DashboardWorkspaceShell({
  access,
  autoStartCheck = false,
  billingNavEnabled = false,
  children,
  hasLiveChecks = false,
}: {
  access: WorkspaceAccessContext;
  autoStartCheck?: boolean;
  billingNavEnabled?: boolean;
  children: React.ReactNode;
  hasLiveChecks?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [isCreateFlowOpen, setIsCreateFlowOpen] = useState(autoStartCheck);
  const [createFlowKey, setCreateFlowKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const experience = resolveDashboardExperience(access.planKey);
  const needsPlan =
    billingNavEnabled && !access.hasActiveSubscription && access.screeningCredits === 0;

  const dismissToast = useCallback(() => setToastMessage(null), []);

  function openCreateFlow() {
    setCreateFlowKey((current) => current + 1);
    setIsCreateFlowOpen(true);
  }

  function closeCreateFlow() {
    setIsCreateFlowOpen(false);
    setCreateFlowKey((current) => current + 1);
    router.refresh();
  }

  function handleCheckCreated() {
    router.refresh();
  }

  useEffect(() => {
    if (!autoStartCheck || typeof window === "undefined") {
      return;
    }

    setCreateFlowKey((current) => current + 1);
    setIsCreateFlowOpen(true);

    const url = new URL(window.location.href);
    url.searchParams.delete("start");
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [autoStartCheck]);

  return (
    <>
      <DashboardLandlordHeader activeNav="checks" welcomeMode={!hasLiveChecks} />

      <div className="dashboard-landlord-page space-y-5">
        {!hasLiveChecks ? (
          <DashboardWelcomeEmpty
            billingNavEnabled={billingNavEnabled}
            needsPlan={needsPlan}
            onStartCheck={openCreateFlow}
          />
        ) : (
          <>
            <TrustSignalsStrip compact />
            {needsPlan ? <DashboardPlanBanner billingNavEnabled={billingNavEnabled} /> : null}
            <LandlordWorkflowStrip compact />
            <WorkspacePrimaryCta labelKey="dashboard.newCheckCta" onClick={openCreateFlow} />
            {children}
          </>
        )}
      </div>

      {isCreateFlowOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-0 sm:items-center sm:justify-center sm:p-6"
          role="dialog"
        >
          <div className="max-h-[min(92vh,100dvh)] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{t("dashboard.newCheckModalTitle")}</p>
              <button
                aria-label={t("dashboard.close")}
                className="workspace-cta-secondary workspace-cta-secondary--compact"
                onClick={closeCreateFlow}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <NewCheckFlow
              billingNavEnabled={billingNavEnabled}
              experience={experience}
              flowKey={createFlowKey}
              needsPlan={needsPlan}
              onCancel={closeCreateFlow}
              onCheckCreated={handleCheckCreated}
              onDraftDeleted={() => setToastMessage(t("newCheckFlow.draftDeletedToast"))}
            />
          </div>
        </div>
      ) : null}

      {toastMessage ? <DashboardToast message={toastMessage} onDismiss={dismissToast} /> : null}
    </>
  );
}
