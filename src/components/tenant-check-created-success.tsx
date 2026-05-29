"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Copy, ExternalLink, Mail, MessageCircle, Share2 } from "lucide-react";
import {
  activateCaseUploadLinkAction,
  sendTenantUploadLinkAction,
  type ActionState,
} from "@/app/actions";
import { FormStatusMessage } from "@/components/form-status-message";
import { LandlordWorkflowStrip } from "@/components/landlord-workflow-strip";
import { SubmitButton } from "@/components/submit-button";
import { useLocale, useT } from "@/lib/i18n/context";
import { withLocalePath } from "@/lib/i18n";

const actionInitialState: ActionState = {};

type TenantCheckCreatedSuccessProps = {
  billingNavEnabled?: boolean;
  checkId: string;
  linkActive: boolean;
  checkStatus?: string;
  propertyName: string;
  tenantName: string;
  tenantEmail?: string;
  uploadUrl?: string;
  onDone: () => void;
};

export function TenantCheckCreatedSuccess({
  billingNavEnabled = true,
  checkId,
  linkActive: initialLinkActive,
  checkStatus: initialCheckStatus,
  onDone,
  propertyName,
  tenantEmail,
  tenantName,
  uploadUrl: initialUploadUrl,
}: TenantCheckCreatedSuccessProps) {
  const { locale, t } = useLocale();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [shareState, setShareState] = useState<"idle" | "shared" | "unsupported">("idle");
  const activateAction = activateCaseUploadLinkAction.bind(null, checkId);
  const sendEmailAction = sendTenantUploadLinkAction.bind(null, checkId);
  const [activateState, activateFormAction] = useActionState(activateAction, actionInitialState);
  const [emailState, emailFormAction] = useActionState(sendEmailAction, actionInitialState);

  const linkActive = initialLinkActive || Boolean(activateState.linkActive);
  const activeUploadUrl = activateState.uploadUrl ?? emailState.uploadUrl ?? initialUploadUrl;
  const isLinkReady = linkActive && Boolean(activeUploadUrl);
  const isWaitingOnTenant =
    isLinkReady ||
    initialCheckStatus === "pending_upload" ||
    activateState.checkStatus === "pending_upload";

  async function handleCopy() {
    if (!activeUploadUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeUploadUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  }

  async function handleShare() {
    if (!activeUploadUrl) {
      return;
    }

    const message = t("checkCreated.whatsappMessage")
      .replace("{link}", activeUploadUrl)
      .replace("{property}", propertyName)
      .replace("{tenant}", tenantName);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          text: message,
          title: t("checkCreated.shareTitle"),
          url: activeUploadUrl,
        });
        setShareState("shared");
        window.setTimeout(() => setShareState("idle"), 2000);
        return;
      } catch {
        // fall through to copy
      }
    }

    await handleCopy();
    setShareState("unsupported");
    window.setTimeout(() => setShareState("idle"), 2000);
  }

  function handleWhatsApp() {
    if (!activeUploadUrl) {
      return;
    }

    const message = t("checkCreated.whatsappMessage")
      .replace("{link}", activeUploadUrl)
      .replace("{property}", propertyName)
      .replace("{tenant}", tenantName);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">
            {isLinkReady ? t("checkCreated.linkReadyTitle") : t("checkCreated.titleSaved")}
          </h2>
          <p className="text-sm leading-6 text-slate-700">
            {isLinkReady ? t("checkCreated.linkHeroBody") : t("checkCreated.bodyLocked")}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{tenantName}</span>
            {propertyName ? ` · ${propertyName}` : ""}
          </p>
        </div>
      </div>

      {isLinkReady ? (
        <div className="space-y-4 rounded-2xl border-2 border-[#0f2343] bg-[#f7f9fc] px-4 py-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0f2343]">{t("checkCreated.linkHeroKicker")}</p>
            <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{t("checkCreated.sharePrompt")}</h3>
            <p className="text-sm leading-6 text-slate-600">{t("checkCreated.linkHeroBody")}</p>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white px-3 py-3">
            <p className="mb-1 text-xs font-medium text-slate-500">{t("checkCreated.uploadLinkLabel")}</p>
            <p className="break-all text-sm font-medium text-slate-900">{activeUploadUrl}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="workspace-cta inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
              onClick={handleCopy}
              type="button"
            >
              <Copy className="h-4 w-4 shrink-0" aria-hidden />
              {copyState === "copied" ? t("checkCreated.copied") : t("checkCreated.copyLink")}
            </button>

            <button
              className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
              onClick={handleShare}
              type="button"
            >
              <Share2 className="h-4 w-4 shrink-0" aria-hidden />
              {shareState === "shared"
                ? t("checkCreated.shared")
                : shareState === "unsupported"
                  ? t("checkCreated.copied")
                  : t("checkCreated.shareLink")}
            </button>

            <button
              className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
              onClick={handleWhatsApp}
              type="button"
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              {t("checkCreated.sendWhatsApp")}
            </button>

            <form action={emailFormAction} className="contents">
              <SubmitButton
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                disabled={!tenantEmail}
                pendingLabel={t("checkCreated.sendingEmail")}
                variant="secondary"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                {t("checkCreated.sendEmail")}
              </SubmitButton>
            </form>

            <Link
              className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold sm:col-span-2"
              href={activeUploadUrl!}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {t("checkCreated.openTenantUploadPage")}
            </Link>
          </div>

          {!tenantEmail ? (
            <p className="text-xs leading-5 text-slate-500">{t("checkCreated.emailMissing")}</p>
          ) : null}

          <FormStatusMessage state={emailState} />
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
          <p className="font-semibold">{t("checkCreated.planRequiredTitle")}</p>
          <p className="mt-1">{t("checkCreated.planRequiredBody")}</p>
          <p className="mt-2 text-xs leading-6">{t("checkCreated.planRequiredWorkflow")}</p>
          <div className="mt-4 flex flex-col gap-2">
            {billingNavEnabled ? (
              <>
                <form action={activateFormAction}>
                  <SubmitButton
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
                    pendingLabel={t("checkCreated.activatingLink")}
                    variant="workspace"
                  >
                    {t("checkCreated.activateLink")}
                  </SubmitButton>
                </form>
                <Link
                  className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
                  href={withLocalePath(locale, "/dashboard/billing")}
                >
                  {t("checkCreated.choosePlan")}
                </Link>
              </>
            ) : (
              <p className="text-xs leading-6">{t("checkCreated.billingUnavailable")}</p>
            )}
          </div>
          <FormStatusMessage state={activateState} />
        </div>
      )}

      <LandlordWorkflowStrip highlightStep={isWaitingOnTenant ? 3 : 2} />

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
        <button className="workspace-cta min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold" onClick={onDone} type="button">
          {t("checkCreated.done")}
        </button>
        <Link
          className="workspace-cta-secondary inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
          href={withLocalePath(locale, `/dashboard/checks/${checkId}`)}
        >
          {t("checkCreated.viewCheck")}
        </Link>
      </div>
    </div>
  );
}
