import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditCard, FileText, Receipt } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/badge";
import { BillingEmptyState } from "@/components/billing-empty-state";
import { BillingPlanAutoCheckout } from "@/components/billing-plan-auto-checkout";
import { BillingPlanFeatures } from "@/components/billing-plan-features";
import { BillingPortalForm } from "@/components/billing-portal-form";
import { SubscriptionCheckoutForm } from "@/components/subscription-checkout-form";
import { parseBillingPlanIntent } from "@/lib/billing-navigation";
import { requireLandlord } from "@/lib/auth";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";
import { BILLING_PLANS, formatStripeAmount, isEntitledSubscriptionStatus, SCREENING_PAYMENT_PRODUCT } from "@/lib/billing";
import {
  getLocalizedPlanDescription,
  getLocalizedPlanFeatures,
  getLocalizedPlanName,
} from "@/lib/billing-i18n";
import { withLocalePath } from "@/lib/i18n";
import { BillingCheckoutSuccess } from "@/components/billing-checkout-success";
import { SignOutForm } from "@/components/sign-out-form";
import { getSafeBillingOverviewForUser } from "@/lib/safe-billing-overview";
import { getStripeProductionReadiness } from "@/lib/env";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: translate(locale, "billing.pageTitle"),
    description: translate(locale, "billing.pageDescription"),
  };
}

function planCardClassName({ featured, selected }: { featured?: boolean; selected?: boolean }) {
  return cn(
    "billing-plan-card",
    (featured || selected) && "billing-plan-card--featured",
  );
}

export default async function DashboardBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string }>;
}) {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(locale, key);
  const localePath = (path: string) => withLocalePath(locale, path);
  const { profile } = await requireLandlord();
  const overview = await getSafeBillingOverviewForUser(profile.id);
  const stripeReadiness = getStripeProductionReadiness();
  const checkoutEnabled = stripeReadiness.isCheckoutReady && overview.schemaReady;
  const currentPlanKey = overview.activeSubscription?.plan_key ?? null;
  const params = await searchParams;
  const checkoutState = params.checkout;
  const selectedPlanIntent = parseBillingPlanIntent(params.plan);
  const paidScreenings = overview.recentScreeningPayments.filter((payment) => payment.status === "paid").length;
  const hasManagedSubscription = Boolean(
    overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status),
  );

  const statusMessages: { key: string; className: string; message: string }[] = [];

  if (!overview.schemaReady || !stripeReadiness.isCheckoutReady) {
    statusMessages.push({
      key: "plans-unavailable",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      message: t("billing.plansUnavailable"),
    });
  }

  if (checkoutState === "success") {
    statusMessages.push({
      key: "checkout-success",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      message: t("billing.checkoutSuccess"),
    });
  } else if (checkoutState === "cancelled") {
    statusMessages.push({
      key: "checkout-cancelled",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      message: t("billing.checkoutCancelled"),
    });
  } else if (checkoutState === "error" || checkoutState === "unconfigured" || checkoutState === "schema") {
    statusMessages.push({
      key: "checkout-error",
      className: "border-amber-200 bg-amber-50 text-amber-950",
      message:
        checkoutState === "error"
          ? t("billing.checkoutError")
          : checkoutState === "unconfigured"
            ? t("billing.checkoutError")
            : t("billing.checkoutError"),
    });
  } else if (selectedPlanIntent && selectedPlanIntent !== "screening" && checkoutState === "auto") {
    statusMessages.push({
      key: "checkout-auto",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      message: t("billing.openingCheckout"),
    });
  } else if (selectedPlanIntent === "screening") {
    statusMessages.push({
      key: "screening-hint",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      message: t("billing.screeningHint"),
    });
  }

  return (
    <main className="min-h-screen bg-slate-50/50">
      <AppHeader
        activeNav="plans"
        homeHref="/dashboard"
        actions={
          <Link className="workspace-cta-secondary" href={localePath("/dashboard")}>
            {t("billing.backToDashboard")}
          </Link>
        }
        subtitle={t("billing.subtitle")}
        title={t("billing.pageTitle")}
      />

      <div className="workspace-page !max-w-7xl space-y-4" data-testid="billing-page">
        {statusMessages.length > 0 ? (
          <div className="space-y-2">
            {statusMessages.map((item) => (
              <div className={cn("status-message", item.className)} key={item.key}>
                {item.message}
              </div>
            ))}
          </div>
        ) : null}

        <Suspense fallback={null}>
          <BillingCheckoutSuccess />
          {selectedPlanIntent && selectedPlanIntent !== "screening" ? (
            <BillingPlanAutoCheckout checkoutFormId={`checkout-form-${selectedPlanIntent}`} />
          ) : null}
        </Suspense>

        <section className="workspace-card" data-testid="billing-subscription-summary">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-label">{t("billing.subscription")}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
                    {currentPlanKey ? getLocalizedPlanName(locale, currentPlanKey) : t("billing.starterLabel")}
                  </h2>
                </div>
                <Badge tone={overview.activeSubscription ? "success" : "neutral"}>
                  {hasManagedSubscription ? t("billing.activeLabel") : t("billing.starterLabel")}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {overview.activeSubscription ? t("billing.subscriptionManaged") : t("billing.subscriptionActive")}
              </p>
              <div className="billing-metrics">
                {[
                  {
                    label: t("billing.statusLabel"),
                    value: overview.activeSubscription
                      ? overview.activeSubscription.status.replaceAll("_", " ")
                      : "—",
                  },
                  {
                    label: t("billing.renewalLabel"),
                    value: overview.activeSubscription?.current_period_end
                      ? formatDate(overview.activeSubscription.current_period_end)
                      : "—",
                  },
                  { label: t("billing.paidScreeningsLabel"), value: String(paidScreenings) },
                ].map((item) => (
                  <div className="metric-tile" key={item.label}>
                    <p className="metric-tile__label">{item.label}</p>
                    <p className="metric-tile__value text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/40 p-4">
              <p className="section-label">{t("billing.paymentAccountLabel")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{overview.customer?.email ?? profile.email}</p>
              <p className="mt-1 text-xs text-slate-600">
                {overview.invoices.length} {t("billing.invoicesOnFile")}
              </p>
              <div className="mt-auto pt-4">
                <BillingPortalForm
                  disabled={!checkoutEnabled}
                  label={t("billing.manageBilling")}
                  pendingLabel={t("billing.openingCheckout")}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3" data-testid="billing-plans">
          <div>
            <p className="section-label">{t("billing.subscription")}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{t("billing.plansSectionTitle")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("billing.plansSectionBody")}</p>
          </div>

          <div className="responsive-plan-grid items-stretch">
            {BILLING_PLANS.map((plan) => {
              const isCurrentPlan = currentPlanKey === plan.key;
              const isSelectedIntent = selectedPlanIntent === plan.key;
              const ctaVariant = plan.featured || isSelectedIntent ? "workspace" : "billing";

              return (
                <article className={planCardClassName({ featured: plan.featured, selected: isSelectedIntent })} key={plan.key}>
                  <div className="billing-plan-card__body">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-slate-950">
                          {getLocalizedPlanName(locale, plan.key)}
                        </h3>
                        {isCurrentPlan ? (
                          <Badge tone="success">{t("billing.current")}</Badge>
                        ) : isSelectedIntent ? (
                          <Badge tone="neutral">{t("billing.selected")}</Badge>
                        ) : plan.featured ? (
                          <Badge tone="warning">{t("billing.popular")}</Badge>
                        ) : null}
                      </div>
                      <p className="text-2xl font-semibold tracking-tight text-slate-950">
                        {plan.shortPrice}
                        <span className="ml-1 text-sm font-medium text-slate-500">{t("billing.perMonth")}</span>
                      </p>
                      <p className="text-xs leading-5 text-slate-600">
                        {getLocalizedPlanDescription(locale, plan.key)}
                      </p>
                    </div>
                    <BillingPlanFeatures features={getLocalizedPlanFeatures(locale, plan.key)} />
                  </div>
                  <div className="billing-plan-card__footer">
                    {hasManagedSubscription ? (
                      <BillingPortalForm
                        disabled={!checkoutEnabled}
                        label={
                          isCurrentPlan
                            ? t("billing.managePlan")
                            : `${t("billing.switchPlan")} ${getLocalizedPlanName(locale, plan.key)}`
                        }
                        pendingLabel={t("billing.openingCheckout")}
                        variant={ctaVariant === "workspace" ? "workspace" : "billing"}
                      />
                    ) : (
                      <SubscriptionCheckoutForm
                        disabled={!checkoutEnabled}
                        formId={`checkout-form-${plan.key}`}
                        label={
                          isCurrentPlan
                            ? t("billing.currentPlan")
                            : isSelectedIntent
                              ? `${t("billing.continuePlan")} · ${getLocalizedPlanName(locale, plan.key)}`
                              : `${t("billing.subscribePlan")} · ${getLocalizedPlanName(locale, plan.key)}`
                        }
                        pendingLabel={t("billing.openingCheckout")}
                        planKey={plan.key}
                        variant={ctaVariant}
                      />
                    )}
                  </div>
                </article>
              );
            })}

            <article className={planCardClassName({ selected: selectedPlanIntent === "screening" })}>
              <div className="billing-plan-card__body">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{t("billing.screening.name")}</h3>
                    {selectedPlanIntent === "screening" ? <Badge tone="neutral">{t("billing.selected")}</Badge> : null}
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">
                    {SCREENING_PAYMENT_PRODUCT.shortPrice}
                    <span className="ml-1 text-sm font-medium text-slate-500">{t("billing.perCheck")}</span>
                  </p>
                  <p className="text-xs leading-5 text-slate-600">{t("billing.screening.description")}</p>
                </div>
                <BillingPlanFeatures
                  features={[t("billing.screening.f1"), t("billing.screening.f2"), t("billing.screening.f3")]}
                />
              </div>
              <div className="billing-plan-card__footer">
                <Link className="workspace-cta-secondary w-full" href={localePath("/dashboard#tenant-cases")}>
                  {t("billing.selectCase")}
                </Link>
              </div>
            </article>

            <article className={planCardClassName({})}>
              <div className="billing-plan-card__body">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{t("billing.enterprise.name")}</h3>
                    <Badge tone="neutral">{t("billing.custom")}</Badge>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">{t("billing.custom")}</p>
                  <p className="text-xs leading-5 text-slate-600">{t("billing.enterprise.description")}</p>
                </div>
                <BillingPlanFeatures
                  features={[
                    t("billing.enterprise.f1"),
                    t("billing.enterprise.f2"),
                    t("billing.enterprise.f3"),
                    t("billing.enterprise.f4"),
                  ]}
                />
              </div>
              <div className="billing-plan-card__footer">
                <Link className="workspace-cta-secondary w-full" href={localePath("/#support")}>
                  {t("billing.contactUs")}
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="workspace-card space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-950">{t("billing.invoices")}</h2>
            </div>
            {overview.invoices.length > 0 ? (
              <ul className="space-y-2">
                {overview.invoices.map((invoice) => (
                  <li
                    className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    key={invoice.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-950">
                          {formatStripeAmount(invoice.total, invoice.currency)}
                        </span>
                        <Badge
                          tone={
                            invoice.status === "paid" ? "success" : invoice.status === "open" ? "warning" : "neutral"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(invoice.invoice_created_at ?? invoice.created_at)}
                      </p>
                    </div>
                    {invoice.hosted_invoice_url ? (
                      <Link className="workspace-cta-secondary shrink-0" href={invoice.hosted_invoice_url} rel="noreferrer" target="_blank">
                        {t("billing.viewInvoice")}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <BillingEmptyState
                description={t("billing.emptyInvoicesBody")}
                icon={FileText}
                title={t("billing.emptyInvoicesTitle")}
              />
            )}
          </div>

          <div className="workspace-card space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-950">{t("billing.screeningPayments")}</h2>
            </div>
            {overview.recentScreeningPayments.length > 0 ? (
              <ul className="space-y-2">
                {overview.recentScreeningPayments.map((payment) => (
                  <li
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5"
                    key={payment.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {formatStripeAmount(payment.amount_total, payment.currency)}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(payment.created_at)}</p>
                    </div>
                    <Badge
                      tone={payment.status === "paid" ? "success" : payment.status === "failed" ? "danger" : "warning"}
                    >
                      {payment.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <BillingEmptyState
                description={t("billing.emptyPaymentsBody")}
                icon={CreditCard}
                title={t("billing.emptyPaymentsTitle")}
              />
            )}
          </div>
        </section>

        <section className="workspace-card border-dashed">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("billing.accountSettings")}
              </p>
              <p className="text-sm text-slate-600">
                {t("billing.signOutNote")}
              </p>
            </div>
            <SignOutForm />
          </div>
        </section>
      </div>
    </main>
  );
}
