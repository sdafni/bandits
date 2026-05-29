"use client";

import { useCallback, useEffect, useState } from "react";
import { NewCheckDraftGate } from "@/components/new-check-draft-gate";
import { NewCheckForm } from "@/components/new-check-form";
import { LandlordWorkflowStrip } from "@/components/landlord-workflow-strip";
import { useT } from "@/lib/i18n/context";
import type { TrustWorkflowExperience } from "@/lib/trust-workflows";
import {
  clearNewCheckDraft,
  hasUnfinishedNewCheckDraft,
  readNewCheckDraft,
  type NewCheckDraft,
} from "@/lib/new-check-draft";

type FlowPhase = "gate" | "form";

export function NewCheckFlow({
  billingNavEnabled = false,
  experience,
  flowKey,
  needsPlan = false,
  onCancel,
  onCheckCreated,
  onDraftDeleted,
}: {
  billingNavEnabled?: boolean;
  experience: TrustWorkflowExperience;
  flowKey: number;
  needsPlan?: boolean;
  onCancel: () => void;
  onCheckCreated: () => void;
  onDraftDeleted?: () => void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<FlowPhase>("form");
  const [resumeDraft, setResumeDraft] = useState<NewCheckDraft | null>(null);
  const [formInstanceKey, setFormInstanceKey] = useState(0);

  useEffect(() => {
    const draft = readNewCheckDraft();
    if (hasUnfinishedNewCheckDraft(draft)) {
      setPhase("gate");
      setResumeDraft(null);
    } else {
      setPhase("form");
      setResumeDraft(null);
    }
    setFormInstanceKey(0);
  }, [flowKey]);

  const beginFreshForm = useCallback(() => {
    clearNewCheckDraft();
    setResumeDraft(null);
    setPhase("form");
    setFormInstanceKey((current) => current + 1);
  }, []);

  function handleContinueDraft() {
    setResumeDraft(readNewCheckDraft());
    setPhase("form");
    setFormInstanceKey((current) => current + 1);
  }

  function handleDeleteDraft() {
    clearNewCheckDraft();
    onDraftDeleted?.();
    beginFreshForm();
  }

  const planNotice = needsPlan ? (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-950">
      {t("dashboard.welcome.lockedUntilPlan")}
    </p>
  ) : null;

  if (phase === "gate") {
    const draft = readNewCheckDraft();
    if (draft && hasUnfinishedNewCheckDraft(draft)) {
      return (
        <div className="space-y-4">
          {planNotice}
          <LandlordWorkflowStrip compact highlightStep={1} />
          <NewCheckDraftGate
          draft={draft}
          onContinueDraft={handleContinueDraft}
          onDeleteDraft={handleDeleteDraft}
          onStartNew={beginFreshForm}
        />
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      {planNotice}
      <LandlordWorkflowStrip compact highlightStep={needsPlan ? 1 : 2} />
      <NewCheckForm
        billingNavEnabled={billingNavEnabled}
        key={`${flowKey}-${formInstanceKey}`}
        experience={experience}
        initialDraft={resumeDraft}
        onCancel={onCancel}
        onCreated={onCheckCreated}
        onDiscardDraft={beginFreshForm}
      />
    </div>
  );
}
