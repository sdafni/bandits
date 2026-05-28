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
import {
  BILLING_PLANS,
  ENTERPRISE_CONTACT_PRODUCT,
  SCREENING_PAYMENT_PRODUCT,
  formatStripeAmount,
  getBillingPlanName,
  getSubscriptionStatusBadge,
  isEntitledSubscriptionStatus,
} from "@/lib/billing";
import { BillingCheckoutSuccess } from "@/components/billing-checkout-success";
import { getBillingOverviewForUser } from "@/lib/billing-queries";
import { getStripeProductionReadiness } from "@/lib/env";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Billing",
  description: "Manage SafeKey subscriptions, invoices, and screening payments.",
};

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
  const isGreek = locale === "el";
  const { profile } = await requireLandlord();
  const overview = await getBillingOverviewForUser(profile.id);
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

  if (!overview.schemaReady) {
    statusMessages.push({
      key: "schema",
      className: "border-amber-200 bg-amber-50 text-amber-950",
      message:
        "Billing tables are not deployed in Supabase yet. Apply migrations `202605270001_add_billing_infrastructure.sql` and `202605270002_stripe_webhook_idempotency.sql` before enabling live checkout.",
    });
  } else if (!stripeReadiness.isCheckoutReady) {
    statusMessages.push({
      key: "stripe-config",
      className: "border-amber-200 bg-amber-50 text-amber-950",
      message: `Stripe production keys or live price IDs are missing. Set ${
        stripeReadiness.missingCheckoutKeys.length > 0
          ? stripeReadiness.missingCheckoutKeys.join(", ")
          : "STRIPE_SECRET_KEY, STRIPE_BASIC_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_PREMIUM_PRICE_ID, STRIPE_SCREENING_PRICE_ID"
      } in Vercel Production, then redeploy.`,
    });
  }

  if (checkoutState === "success") {
    statusMessages.push({
      key: "checkout-success",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      message: "Subscription activated successfully.",
    });
  } else if (checkoutState === "cancelled") {
    statusMessages.push({
      key: "checkout-cancelled",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      message: "Checkout was canceled. Your existing billing setup has not been changed.",
    });
  } else if (checkoutState === "error" || checkoutState === "unconfigured" || checkoutState === "schema") {
    statusMessages.push({
      key: "checkout-error",
      className: "border-amber-200 bg-amber-50 text-amber-950",
      message:
        checkoutState === "error"
          ? "Stripe checkout could not be started. Use the plan buttons below to try again."
          : checkoutState === "unconfigured"
            ? "Stripe is not fully configured in production yet."
            : "Billing tables are not ready in Supabase.",
    });
  } else if (selectedPlanIntent && selectedPlanIntent !== "screening" && checkoutState === "auto") {
    statusMessages.push({
      key: "checkout-auto",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      message: `Opening Stripe checkout for the ${selectedPlanIntent} plan...`,
    });
  } else if (selectedPlanIntent === "screening") {
    statusMessages.push({
      key: "screening-hint",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      message:
        "Single screening payments are purchased from an individual tenant case on your dashboard.",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50/50">
      <AppHeader
        activeNav="billing"
        homeHref="/dashboard"
        locale={locale}
        actions={
          <Link className="workspace-cta-secondary" href="/dashboard">
            {isGreek ? "Επιστροφή στον πίνακα" : "Back to dashboard"}
          </Link>
        }
        subtitle={
          isGreek
            ? "Συνδρομές, τιμολόγια και ανά υπόθεση χρέωση — συγχρονισμένα με Stripe."
            : "Subscriptions, invoices, and per-case screening — synced with Stripe."
        }
        title={isGreek ? "Χρέωση" : "Billing"}
      />

      <div className="workspace-page !max-w-7xl space-y-4">
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

        <section className="workspace-card">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-label">Subscription</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
                    {getBillingPlanName(currentPlanKey)}
                  </h2>
                </div>
                <Badge tone={overview.activeSubscription ? "success" : "neutral"}>
                  {getSubscriptionStatusBadge(hasManagedSubscription)}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {overview.activeSubscription
                  ? "Synced from Stripe. Manage payment methods and invoices in the billing portal."
                  : "Select a monthly plan below, or pay per screening from a tenant case."}
              </p>
              <div className="billing-metrics">
                {[
                  {
                    label: "Status",
                    value: overview.activeSubscription
                      ? overview.activeSubscription.status.replaceAll("_", " ")
                      : "—",
                  },
                  {
                    label: "Renewal",
                    value: overview.activeSubscription?.current_period_end
                      ? formatDate(overview.activeSubscription.current_period_end)
                      : "—",
                  },
                  { label: "Paid screenings", value: String(paidScreenings) },
                ].map((item) => (
                  <div className="metric-tile" key={item.label}>
                    <p className="metric-tile__label">{item.label}</p>
                    <p className="metric-tile__value text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/40 p-4">
              <p className="section-label">Stripe account</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{overview.customer?.email ?? profile.email}</p>
              <p className="mt-1 text-xs text-slate-600">{overview.invoices.length} invoices on file</p>
              {stripeReadiness.isCheckoutReady && !stripeReadiness.hasWebhookSecret ? (
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  Add `STRIPE_WEBHOOK_SECRET` in Vercel to sync subscription events automatically.
                </p>
              ) : null}
              <div className="mt-auto pt-4">
                <BillingPortalForm disabled={!checkoutEnabled} label="Manage billing" pendingLabel="Opening..." />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="section-label">Plans</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Choose your billing layer</h2>
            <p className="mt-1 text-sm text-slate-600">
              Monthly subscriptions for volume, or pay per case when you need occasional reports.
            </p>
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
                        <h3 className="text-base font-semibold text-slate-950">{plan.name}</h3>
                        {isCurrentPlan ? (
                          <Badge tone="success">Current</Badge>
                        ) : isSelectedIntent ? (
                          <Badge tone="neutral">Selected</Badge>
                        ) : plan.featured ? (
                          <Badge tone="warning">Popular</Badge>
                        ) : null}
                      </div>
                      <p className="text-2xl font-semibold tracking-tight text-slate-950">
                        {plan.shortPrice}
                        <span className="ml-1 text-sm font-medium text-slate-500">/mo</span>
                      </p>
                      <p className="text-xs leading-5 text-slate-600">{plan.description}</p>
                    </div>
                    <BillingPlanFeatures features={plan.features} />
                  </div>
                  <div className="billing-plan-card__footer">
                    {hasManagedSubscription ? (
                      <BillingPortalForm
                        disabled={!checkoutEnabled}
                        label={isCurrentPlan ? "Manage plan" : `Switch to ${plan.name}`}
                        pendingLabel="Opening..."
                        variant={ctaVariant === "workspace" ? "workspace" : "billing"}
                      />
                    ) : (
                      <SubscriptionCheckoutForm
                        disabled={!checkoutEnabled}
                        formId={`checkout-form-${plan.key}`}
                        label={
                          isCurrentPlan
                            ? "Current plan"
                            : isSelectedIntent
                              ? `Continue · ${plan.name}`
                              : `Subscribe · ${plan.name}`
                        }
                        pendingLabel="Opening checkout..."
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
                    <h3 className="text-base font-semibold text-slate-950">{SCREENING_PAYMENT_PRODUCT.name}</h3>
                    {selectedPlanIntent === "screening" ? <Badge tone="neutral">Selected</Badge> : null}
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">Pay per case</p>
                  <p className="text-xs leading-5 text-slate-600">{SCREENING_PAYMENT_PRODUCT.description}</p>
                </div>
                <BillingPlanFeatures features={SCREENING_PAYMENT_PRODUCT.features} />
              </div>
              <div className="billing-plan-card__footer">
                <Link className="workspace-cta-secondary w-full" href="/dashboard#tenant-cases">
                  Select tenant case
                </Link>
              </div>
            </article>

            <article className={planCardClassName({})}>
              <div className="billing-plan-card__body">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{ENTERPRISE_CONTACT_PRODUCT.name}</h3>
                    <Badge tone="neutral">Custom</Badge>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">Custom</p>
                  <p className="text-xs leading-5 text-slate-600">{ENTERPRISE_CONTACT_PRODUCT.description}</p>
                </div>
                <BillingPlanFeatures features={ENTERPRISE_CONTACT_PRODUCT.features} />
              </div>
              <div className="billing-plan-card__footer">
                <Link className="workspace-cta-secondary w-full" href="/#support">
                  Contact us
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="workspace-card space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-950">Invoices</h2>
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
                        View
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <BillingEmptyState
                description="Invoices appear after your first subscription charge."
                icon={FileText}
                title="No invoices yet"
              />
            )}
          </div>

          <div className="workspace-card space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-950">Screening payments</h2>
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
                description="Pay per screening from any tenant case on your dashboard."
                icon={CreditCard}
                title="No screening payments yet"
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
