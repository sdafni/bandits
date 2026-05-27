# SafeKey Billing QA Checklist (Production)

## Stripe product and price mapping
- [ ] Basic plan price is active and mapped to `STRIPE_BASIC_PRICE_ID`.
- [ ] Pro plan price is active and mapped to `STRIPE_PRO_PRICE_ID`.
- [ ] Premium plan price is active and mapped to `STRIPE_PREMIUM_PRICE_ID`.
- [ ] One-time screening price is active and mapped to `STRIPE_SCREENING_PRICE_ID`.
- [ ] All prices are EUR and tied to the intended live products.

## End-to-end subscription flow
- [ ] New landlord can sign up, log in, and open `/dashboard/billing`.
- [ ] Plan checkout opens Stripe Checkout for Basic/Pro/Premium.
- [ ] Successful payment redirects to `/dashboard/billing?checkout=success`.
- [ ] `billing_customers` row exists after first checkout.
- [ ] `billing_subscriptions` row exists with matching `plan_key` and `status`.
- [ ] `billing_checkout_sessions` row is marked `completed`.
- [ ] Billing page shows current plan and renewal date from synced data.

## Subscription lifecycle
- [ ] Upgrade in Stripe portal updates subscription and plan in dashboard.
- [ ] Downgrade in Stripe portal updates subscription and plan in dashboard.
- [ ] Cancel at period end updates `cancel_at_period_end = true`.
- [ ] Full cancellation updates status and blocks unpaid report generation.
- [ ] Renewal invoice appears in `billing_invoices`.

## One-time screening payment flow
- [ ] Landlord without active subscription can pay from tenant case page.
- [ ] Successful one-time payment creates/updates `screening_payments` row with `paid`.
- [ ] Report generation unlocks for that tenant check.
- [ ] Failed payment creates/updates `screening_payments` row with `failed`.
- [ ] Duplicate checkout attempts do not create duplicate screening rows.

## Webhook reliability and idempotency
- [ ] Webhook endpoint is reachable at `/api/stripe/webhook` in production.
- [ ] Duplicate event delivery is handled once (idempotent by `stripe_event_id`).
- [ ] `stripe_webhook_events.status` transitions `processing -> processed`.
- [ ] Handler marks failed events as `failed` with `error_message`.
- [ ] `invoice.payment_failed` updates invoice state visibly in dashboard/admin.
- [ ] `payment_intent.payment_failed` marks checkout/screening payment as failed.

## Admin billing visibility
- [ ] Admin review page shows active subscription summary.
- [ ] Admin review page shows billing status and schema readiness.
- [ ] Admin review page shows payment history and failed payment count.
- [ ] Admin review page shows screening credits count.

## Regression checks
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `node scripts/production-qa-review.cjs` passes without route timeout failures.
