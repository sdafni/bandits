"use client";

import { useCallback, useEffect, useState } from "react";
import { NewCheckDraftGate } from "@/components/new-check-draft-gate";
import { NewCheckForm } from "@/components/new-check-form";
import { LandlordWorkflowStrip } from "@/components/landlord-workflow-strip";
import type { MonetizationPermissionsSnapshot } from "@/lib/monetization";
import {
  clearNewCheckDraft,
  hasUnfinishedNewCheckDraft,
  readNewCheckDraft,
  type NewCheckDraft,
} from "@/lib/new-check-draft";
import type { TrustWorkflowExperience } from "@/lib/trust-workflows";

type FlowPhase = "gate" | "form";

export function NewCheckFlow({
  experience,
  flowKey,
  monetizationPermissions,
  onCancel,
  onCheckCreated,
  onDraftDeleted,
}: {
  experience: TrustWorkflowExperience;
  flowKey: number;
  monetizationPermissions: MonetizationPermissionsSnapshot;
  onCancel: () => void;
  onCheckCreated: () => void;
  onDraftDeleted?: () => void;
}) {
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

  const workflowStep = monetizationPermissions.shouldPromptPlanBeforeUploadLink
    ? 1
    : monetizationPermissions.canCreateUploadLink
      ? 2
      : 1;

  if (phase === "gate") {
    const draft = readNewCheckDraft();
    if (draft && hasUnfinishedNewCheckDraft(draft)) {
      return (
        <div className="space-y-4">
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
      <LandlordWorkflowStrip compact highlightStep={workflowStep} />
      <NewCheckForm
        key={`${flowKey}-${formInstanceKey}`}
        experience={experience}
        initialDraft={resumeDraft}
        monetizationPermissions={monetizationPermissions}
        onCancel={onCancel}
        onCreated={onCheckCreated}
        onDiscardDraft={beginFreshForm}
      />
    </div>
  );
}
