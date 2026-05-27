import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditCard, FileText, Receipt, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/badge";
import { BillingEmptyState } from "@/components/billing-empty-state";
import { BillingPlanAutoCheckout } from "@/components/billing-plan-auto-checkout";
import { BillingPlanFeatures } from "@/components/billing-plan-features";
import { BillingPortalForm } from "@/components/billing-portal-form";
import { SubscriptionCheckoutForm } from "@/components/subscription-checkout-form";
import { parseBillingPlanIntent } from "@/lib/billing-navigation";
import { requireLandlord } from "@/lib/auth";
import {
  BILLING_PLANS,
  SCREENING_PAYMENT_PRODUCT,
  formatStripeAmount,
  getBillingPlanName,
  isEntitledSubscriptionStatus,
} from "@/lib/billing";
import { getBillingOverviewForUser } from "@/lib/billing-queries";
import { getStripeProductionReadiness } from "@/lib/env";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Billing",
  description: "Manage SafeKey subscriptions, invoices, and screening payments.",
};

function planCardClassName({
  featured,
  selected,
}: {
  featured?: boolean;
  selected?: boolean;
}) {
  return cn(
    "card billing-plan-card",
    (featured || selected) && "border-[#cfb06a] shadow-[0_18px_40px_rgba(15,35,67,0.09)]",
  );
}

export default async function DashboardBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string }>;
}) {
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
      className: "border-amber-300 bg-amber-50 text-amber-950",
      message:
        "Billing tables are not deployed in Supabase yet. Apply migrations `202605270001_add_billing_infrastructure.sql` and `202605270002_stripe_webhook_idempotency.sql` before enabling live checkout.",
    });
  } else if (!stripeReadiness.isCheckoutReady) {
    statusMessages.push({
      key: "stripe-config",
      className: "border-amber-300 bg-amber-50 text-amber-950",
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
      message:
        "Billing updated successfully. Stripe is processing the latest checkout and SafeKey will reflect the final subscription state automatically.",
    });
  } else if (checkoutState === "cancelled") {
    statusMessages.push({
      key: "checkout-cancelled",
      className: "border-[#e9dfc5] bg-[#fcfaf4] text-[#5d4e31]",
      message: "Checkout was canceled. Your existing billing setup has not been changed.",
    });
  } else if (checkoutState === "error" || checkoutState === "unconfigured" || checkoutState === "schema") {
    statusMessages.push({
      key: "checkout-error",
      className: "border-amber-300 bg-amber-50 text-amber-950",
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
      className: "border-[#e9dfc5] bg-[#fcfaf4] text-[#5d4e31]",
      message: `Opening Stripe checkout for the ${selectedPlanIntent} plan...`,
    });
  } else if (selectedPlanIntent === "screening") {
    statusMessages.push({
      key: "screening-hint",
      className: "border-[#e9dfc5] bg-[#fcfaf4] text-[#5d4e31]",
      message:
        "Single screening payments are purchased from an individual tenant case. Open a case on your dashboard, then choose pay-per-screening on that case.",
    });
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]/40">
      <AppHeader
        activeNav="billing"
        homeHref="/dashboard"
        actions={
          <Link className="secondary-action min-h-11 rounded-[18px] px-4 py-2.5 text-sm" href="/dashboard">
            Back to dashboard
          </Link>
        }
        subtitle="Subscriptions, invoices, and per-case screening payments — synced with Stripe."
        title="Billing and plans"
      />

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-7">
        {statusMessages.length > 0 ? (
          <div className="space-y-3">
            {statusMessages.map((item) => (
              <div className={cn("status-message", item.className)} key={item.key}>
                {item.message}
              </div>
            ))}
          </div>
        ) : null}

        <Suspense fallback={null}>
          {selectedPlanIntent && selectedPlanIntent !== "screening" ? (
            <BillingPlanAutoCheckout checkoutFormId={`checkout-form-${selectedPlanIntent}`} />
          ) : null}
        </Suspense>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
          <div className="brand-hero space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Current subscription</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                  {getBillingPlanName(currentPlanKey)}
                </h2>
              </div>
              <Badge tone={overview.activeSubscription ? "success" : "neutral"}>
                {overview.activeSubscription ? "Active billing" : "No plan"}
              </Badge>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {overview.activeSubscription
                ? "Your workspace billing is synced from Stripe. Manage payment methods, invoices, and plan changes from the billing portal."
                : "Choose a monthly plan below, or purchase single screenings from individual tenant cases when you need pay-as-you-go flexibility."}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="brand-metric px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a6980]">Status</p>
                <p className="mt-2 text-base font-semibold text-[#0f2343]">
                  {overview.activeSubscription
                    ? overview.activeSubscription.status.replaceAll("_", " ")
                    : "Not subscribed"}
                </p>
              </div>
              <div className="brand-metric px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a6980]">Renewal</p>
                <p className="mt-2 text-base font-semibold text-[#0f2343]">
                  {overview.activeSubscription?.current_period_end
                    ? formatDate(overview.activeSubscription.current_period_end)
                    : "—"}
                </p>
              </div>
              <div className="brand-metric px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a6980]">Paid screenings</p>
                <p className="mt-2 text-base font-semibold text-[#0f2343]">{paidScreenings}</p>
              </div>
            </div>
          </div>

          <div className="card flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Billing management</p>
                <h2 className="mt-1.5 text-xl font-semibold text-slate-950">Stripe customer account</h2>
              </div>
              <Badge tone={overview.customer ? "info" : "warning"}>
                {overview.customer ? "Connected" : "Pending"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
                <p className="text-xs font-medium text-slate-500">Billing email</p>
                <p className="mt-1.5 text-sm font-semibold text-slate-950">{overview.customer?.email ?? profile.email}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
                <p className="text-xs font-medium text-slate-500">Invoice history</p>
                <p className="mt-1.5 text-sm font-semibold text-slate-950">{overview.invoices.length} on file</p>
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-600">
              Update payment methods, download invoices, and change plans in the Stripe-hosted billing portal.
            </p>

            {stripeReadiness.isCheckoutReady && !stripeReadiness.hasWebhookSecret ? (
              <p className="rounded-2xl border border-[#e9dfc5] bg-[#fcfaf4] px-4 py-3 text-xs leading-5 text-[#5d4e31]">
                Checkout is live. Add `STRIPE_WEBHOOK_SECRET` in Vercel Production to sync subscription events into
                SafeKey automatically.
              </p>
            ) : null}

            <div className="mt-auto pt-1">
              <BillingPortalForm disabled={!checkoutEnabled} label="Manage billing" pendingLabel="Opening portal..." />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Plans</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                Choose the right billing layer
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Monthly subscriptions for ongoing screening volume, or pay per case when you only need occasional reports.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-[#8b6b17]" />
              All plans include secure document workflow
            </div>
          </div>

          <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {BILLING_PLANS.map((plan) => {
              const isCurrentPlan = currentPlanKey === plan.key;
              const isSelectedIntent = selectedPlanIntent === plan.key;

              return (
                <article
                  className={planCardClassName({ featured: plan.featured, selected: isSelectedIntent })}
                  key={plan.key}
                >
                  <div className="billing-plan-card__body">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
                        {isCurrentPlan ? (
                          <Badge tone="success">Current</Badge>
                        ) : isSelectedIntent ? (
                          <Badge tone="info">Selected</Badge>
                        ) : plan.featured ? (
                          <Badge tone="warning">Popular</Badge>
                        ) : null}
                      </div>
                      <p className="text-3xl font-semibold tracking-[-0.04em] text-[#0f2343]">
                        {plan.shortPrice}
                        <span className="ml-1 text-sm font-medium text-slate-500">/mo</span>
                      </p>
                      <p className="text-sm leading-6 text-slate-600">{plan.description}</p>
                    </div>

                    <BillingPlanFeatures features={plan.features} />
                  </div>

                  <div className="billing-plan-card__footer">
                    {hasManagedSubscription ? (
                      <BillingPortalForm
                        disabled={!checkoutEnabled}
                        label={isCurrentPlan ? "Manage current plan" : `Change to ${plan.name}`}
                        pendingLabel="Opening billing..."
                      />
                    ) : (
                      <SubscriptionCheckoutForm
                        disabled={!checkoutEnabled}
                        formId={`checkout-form-${plan.key}`}
                        label={
                          isCurrentPlan
                            ? "Current selection"
                            : isSelectedIntent
                              ? `Continue to ${plan.name}`
                              : `Subscribe to ${plan.name}`
                        }
                        pendingLabel="Opening checkout..."
                        planKey={plan.key}
                      />
                    )}
                  </div>
                </article>
              );
            })}

            <article className={planCardClassName({ selected: selectedPlanIntent === "screening" })}>
              <div className="billing-plan-card__body">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-950">{SCREENING_PAYMENT_PRODUCT.name}</h3>
                    {selectedPlanIntent === "screening" ? <Badge tone="info">Selected</Badge> : null}
                  </div>
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-[#0f2343]">Pay per case</p>
                  <p className="text-sm leading-6 text-slate-600">{SCREENING_PAYMENT_PRODUCT.description}</p>
                </div>

                <BillingPlanFeatures features={SCREENING_PAYMENT_PRODUCT.features} />
              </div>

              <div className="billing-plan-card__footer">
                <Link className="billing-cta" href="/dashboard">
                  Select a tenant case
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="card space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <Receipt className="h-5 w-5 text-[#5a6980]" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Invoices</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Recent billing history</h2>
              </div>
            </div>

            {overview.invoices.length > 0 ? (
              <div className="space-y-2.5">
                {overview.invoices.map((invoice) => (
                  <article
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                    key={invoice.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {formatStripeAmount(invoice.total, invoice.currency)}
                        </p>
                        <Badge
                          tone={
                            invoice.status === "paid" ? "success" : invoice.status === "open" ? "warning" : "info"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Issued {formatDate(invoice.invoice_created_at ?? invoice.created_at)}
                      </p>
                    </div>
                    {invoice.hosted_invoice_url ? (
                      <Link
                        className="billing-cta w-full sm:w-auto sm:min-w-[9.5rem]"
                        href={invoice.hosted_invoice_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View invoice
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <BillingEmptyState
                description="After your first subscription charge or plan upgrade, Stripe invoices will appear here with download links."
                icon={FileText}
                title="No invoices yet"
              />
            )}
          </div>

          <div className="card space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <CreditCard className="h-5 w-5 text-[#5a6980]" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Pay-as-you-go</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">One-time screening payments</h2>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
              <p className="text-sm font-semibold text-slate-950">{SCREENING_PAYMENT_PRODUCT.name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{SCREENING_PAYMENT_PRODUCT.description}</p>
            </div>

            {overview.recentScreeningPayments.length > 0 ? (
              <div className="space-y-2.5">
                {overview.recentScreeningPayments.map((payment) => (
                  <div
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white"
                    key={payment.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {formatStripeAmount(payment.amount_total, payment.currency)}
                      </p>
                      <Badge
                        tone={
                          payment.status === "paid" ? "success" : payment.status === "failed" ? "danger" : "warning"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Created {formatDate(payment.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <BillingEmptyState
                description="Open a tenant case on your dashboard and use pay-per-screening when you need a one-off report without a subscription."
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
