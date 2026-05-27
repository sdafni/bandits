# Stripe Production Deployment Checklist

## 1) Stripe dashboard setup (live mode)
- [ ] Create/confirm products: Basic, Pro, Premium, Screening (one-time).
- [ ] Create/confirm live prices and copy all live `price_...` IDs.
- [ ] Enable Stripe Customer Portal.
- [ ] In Customer Portal settings, allow:
  - [ ] Plan changes (upgrade/downgrade)
  - [ ] Payment method updates
  - [ ] Invoice history access
  - [ ] Subscription cancellation

## 2) Environment configuration
Set these in Vercel production environment:
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_BASIC_PRICE_ID`
- [ ] `STRIPE_PRO_PRICE_ID`
- [ ] `STRIPE_PREMIUM_PRICE_ID`
- [ ] `STRIPE_SCREENING_PRICE_ID`
- [ ] `NEXT_PUBLIC_APP_URL=https://getsafekey.app`
- [ ] `NEXT_PUBLIC_SITE_URL=https://getsafekey.app`

## 3) Supabase schema
- [ ] Run `supabase/migrations/202605270001_add_billing_infrastructure.sql`.
- [ ] Run `supabase/migrations/202605270002_stripe_webhook_idempotency.sql`.
- [ ] Confirm tables exist:
  - [ ] `billing_customers`
  - [ ] `billing_subscriptions`
  - [ ] `billing_invoices`
  - [ ] `billing_checkout_sessions`
  - [ ] `screening_payments`
  - [ ] `stripe_webhook_events`

## 4) Webhook endpoint
- [ ] Configure live endpoint URL: `https://getsafekey.app/api/stripe/webhook`.
- [ ] Subscribe to events:
  - [ ] `checkout.session.completed`
  - [ ] `checkout.session.async_payment_succeeded`
  - [ ] `checkout.session.async_payment_failed`
  - [ ] `checkout.session.expired`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.created`
  - [ ] `invoice.finalized`
  - [ ] `invoice.updated`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `invoice.voided`
  - [ ] `payment_intent.payment_failed`

## 5) Post-deploy verification
- [ ] Complete one live subscription checkout.
- [ ] Complete one live screening payment.
- [ ] Verify webhook events are marked `processed`.
- [ ] Verify billing and admin pages reflect synced data.
- [ ] Verify cancellation and downgrade behavior in portal.
