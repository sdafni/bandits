import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/badge";
import { BillingPlanAutoCheckout } from "@/components/billing-plan-auto-checkout";
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
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Billing",
  description: "Manage SafeKey subscriptions, invoices, and screening payments.",
};

export default async function DashboardBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string }>;
}) {
  const { profile } = await requireLandlord();
  const overview = await getBillingOverviewForUser(profile.id);
  const stripeReadiness = getStripeProductionReadiness();
  const currentPlanKey = overview.activeSubscription?.plan_key ?? null;
  const params = await searchParams;
  const checkoutState = params.checkout;
  const selectedPlanIntent = parseBillingPlanIntent(params.plan);

  return (
    <main className="min-h-screen">
      <AppHeader
        activeNav="billing"
        homeHref="/dashboard"
        actions={
          <Link
            className="secondary-action min-h-12 rounded-[18px] px-5 py-3"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        }
        subtitle="Manage your SafeKey subscription, update billing details in Stripe, and review recent invoices and one-time screening payments."
        title="Billing and plans"
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        {!overview.schemaReady ? (
          <div className="status-message border-amber-300 bg-amber-50 text-amber-950">
            Billing tables are not deployed in Supabase yet. Apply migrations
            `202605270001_add_billing_infrastructure.sql` and
            `202605270002_stripe_webhook_idempotency.sql` before enabling live checkout.
          </div>
        ) : null}
        {!stripeReadiness.isReady ? (
          <div className="status-message border-amber-300 bg-amber-50 text-amber-950">
            Stripe production keys or live price IDs are missing. Configure all `STRIPE_*` environment variables
            before accepting payments.
          </div>
        ) : null}
        {checkoutState === "success" ? (
          <div className="status-message border-emerald-200 bg-emerald-50 text-emerald-800">
            Billing updated successfully. Stripe is processing the latest checkout and SafeKey will reflect the
            final subscription state automatically.
          </div>
        ) : null}
        {checkoutState === "cancelled" ? (
          <div className="status-message border-[#e9dfc5] bg-[#fcfaf4] text-[#5d4e31]">
            Checkout was canceled. Your existing billing setup has not been changed.
          </div>
        ) : null}
        {checkoutState === "error" || checkoutState === "unconfigured" || checkoutState === "schema" ? (
          <div className="status-message border-amber-300 bg-amber-50 text-amber-950">
            {checkoutState === "error"
              ? "Stripe checkout could not be started. Use the plan buttons below to try again."
              : checkoutState === "unconfigured"
                ? "Stripe is not fully configured in production yet."
                : "Billing tables are not ready in Supabase."}
          </div>
        ) : null}
        {selectedPlanIntent && selectedPlanIntent !== "screening" && checkoutState === "auto" ? (
          <div className="status-message border-[#e9dfc5] bg-[#fcfaf4] text-[#5d4e31]">
            Opening Stripe checkout for the {selectedPlanIntent} plan...
          </div>
        ) : null}
        {selectedPlanIntent === "screening" ? (
          <div className="status-message border-[#e9dfc5] bg-[#fcfaf4] text-[#5d4e31]">
            Single screening payments are purchased from an individual tenant case. Open a case on your dashboard,
            then choose pay-per-screening on that case.
          </div>
        ) : null}

        <Suspense fallback={null}>
          {selectedPlanIntent && selectedPlanIntent !== "screening" ? (
            <BillingPlanAutoCheckout checkoutFormId={`checkout-form-${selectedPlanIntent}`} />
          ) : null}
        </Suspense>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="brand-hero grid gap-5 p-5 sm:p-7">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Current subscription</p>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                {getBillingPlanName(currentPlanKey)}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                {overview.activeSubscription
                  ? "Your billing state is synced from Stripe. Use the billing portal for upgrades, downgrades, payment methods, and invoice management."
                  : "No active subscription is attached to this workspace yet. Choose a plan below or pay per screening from an individual tenant case."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6980]">Status</p>
                <p className="mt-3 text-lg font-semibold text-[#0f2343]">
                  {overview.activeSubscription ? overview.activeSubscription.status.replaceAll("_", " ") : "Not subscribed"}
                </p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6980]">Renewal</p>
                <p className="mt-3 text-lg font-semibold text-[#0f2343]">
                  {overview.activeSubscription?.current_period_end
                    ? formatDate(overview.activeSubscription.current_period_end)
                    : "Not scheduled"}
                </p>
              </div>
              <div className="brand-metric">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6980]">Invoices</p>
                <p className="mt-3 text-lg font-semibold text-[#0f2343]">{overview.invoices.length}</p>
              </div>
            </div>
          </div>

          <div className="card space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Billing management</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Stripe customer account</h2>
              </div>
              <Badge tone={overview.customer ? "info" : "warning"}>
                {overview.customer ? "Connected" : "Not created yet"}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Billing email</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {overview.customer?.email ?? profile.email}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">One-time screenings</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {overview.recentScreeningPayments.filter((payment) => payment.status === "paid").length} completed
                </p>
              </div>
            </div>

            <p className="text-sm leading-7 text-slate-600">
              {SCREENING_PAYMENT_PRODUCT.name} remains available from each tenant case when there is no active
              subscription covering the screening workflow.
            </p>

            <BillingPortalForm className="w-full" />
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Plans</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Choose the right billing layer for your screening volume.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {BILLING_PLANS.map((plan) => {
              const isCurrentPlan = currentPlanKey === plan.key;
              const hasManagedSubscription = Boolean(
                overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status),
              );

              const isSelectedIntent = selectedPlanIntent === plan.key;

              return (
                <article
                  className={`card space-y-6 ${
                    plan.featured || isSelectedIntent
                      ? "border-[#cfb06a] shadow-[0_22px_48px_rgba(15,35,67,0.11)]"
                      : ""
                  }`}
                  key={plan.key}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl font-semibold text-slate-950">{plan.name}</h3>
                      {isCurrentPlan ? (
                        <Badge tone="success">Current plan</Badge>
                      ) : isSelectedIntent ? (
                        <Badge tone="info">Selected</Badge>
                      ) : plan.featured ? (
                        <Badge tone="warning">Most popular</Badge>
                      ) : null}
                    </div>
                    <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">{plan.shortPrice}</p>
                    <p className="text-sm leading-7 text-slate-700">{plan.description}</p>
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div className="flex items-start gap-3 text-sm font-medium text-slate-800" key={feature}>
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#0f2343]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {hasManagedSubscription ? (
                    <BillingPortalForm
                      className="w-full rounded-[18px] px-5 py-3 text-sm font-semibold"
                      label={isCurrentPlan ? "Manage current plan" : `Change to ${plan.name}`}
                      pendingLabel="Opening billing..."
                      variant={plan.featured ? "primary" : "secondary"}
                    />
                  ) : (
                    <SubscriptionCheckoutForm
                      className="w-full rounded-[18px] px-5 py-3 text-sm font-semibold"
                      formId={`checkout-form-${plan.key}`}
                      label={
                        isCurrentPlan
                          ? "Current selection"
                          : isSelectedIntent
                            ? `Continue to ${plan.name} checkout`
                            : `Subscribe to ${plan.name}`
                      }
                      pendingLabel="Opening checkout..."
                      planKey={plan.key}
                      variant={plan.featured || isSelectedIntent ? "primary" : "secondary"}
                    />
                  )}
                </article>
              );
            })}

            <article
              className={`card space-y-6 ${selectedPlanIntent === "screening" ? "border-[#cfb06a] shadow-[0_22px_48px_rgba(15,35,67,0.11)]" : ""}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-slate-950">{SCREENING_PAYMENT_PRODUCT.name}</h3>
                  {selectedPlanIntent === "screening" ? <Badge tone="info">Selected</Badge> : null}
                </div>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0f2343]">Pay per case</p>
                <p className="text-sm leading-7 text-slate-700">{SCREENING_PAYMENT_PRODUCT.description}</p>
              </div>
              <Link className="primary-action inline-flex min-h-12 w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold" href="/dashboard">
                Open dashboard to select a case
              </Link>
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Invoices</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Recent billing history</h2>
            </div>

            {overview.invoices.length > 0 ? (
              <div className="space-y-3">
                {overview.invoices.map((invoice) => (
                  <article
                    className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={invoice.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-semibold text-slate-950">
                          {formatStripeAmount(invoice.total, invoice.currency)}
                        </p>
                        <Badge tone={invoice.status === "paid" ? "success" : invoice.status === "open" ? "warning" : "info"}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Issued {formatDate(invoice.invoice_created_at ?? invoice.created_at)}
                      </p>
                    </div>
                    {invoice.hosted_invoice_url ? (
                      <Link
                        className="secondary-action min-h-12 rounded-[18px] px-4 py-3 text-sm"
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
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                Invoices will appear here after the first successful Stripe charge or subscription cycle.
              </div>
            )}
          </div>

          <div className="card space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">Pay-as-you-go</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">One-time screening payments</h2>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-base font-semibold text-slate-950">{SCREENING_PAYMENT_PRODUCT.name}</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{SCREENING_PAYMENT_PRODUCT.description}</p>
            </div>

            {overview.recentScreeningPayments.length > 0 ? (
              <div className="space-y-3">
                {overview.recentScreeningPayments.map((payment) => (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={payment.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {formatStripeAmount(payment.amount_total, payment.currency)}
                      </p>
                      <Badge tone={payment.status === "paid" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Created {formatDate(payment.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                One-time screening payments appear here after you purchase a per-case report from a tenant case.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
