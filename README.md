# SafeKey

SafeKey is AI-powered tenant screening and rental protection infrastructure for the Greek rental market.

## Core flows

- Landlord signup, login, logout, and dashboard access with Supabase Auth
- Tenant check creation with secure applicant upload links
- Tenant profile and document uploads into Supabase Storage
- Admin review, risk scoring, protection eligibility, and package assignment
- Landlord-facing final report with score, recommendation, red flags, and protection outlook
- Stripe-powered subscriptions, billing portal management, invoices, and one-time screening checkout
- Curated presentation scenarios for investor and insurance-partner walkthroughs

## Stack

- Next.js App Router
- Supabase Auth, Postgres, Storage, and Row Level Security
- Tailwind CSS
- Optional OpenAI integration with heuristic fallback
- Stripe Checkout, Billing Portal, and webhooks for SaaS billing

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=https://getsafekey.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ADMIN_EMAILS=admin@getsafekey.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_BASIC_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
STRIPE_SCREENING_PRICE_ID=
```

Use either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Supabase setup

1. Create or open the SafeKey Supabase project.
2. Run the SQL migrations in `supabase/migrations/`.
3. Confirm the `tenant-documents` storage bucket exists.
4. Add the public and service role keys to `.env.local`.
5. Add at least one admin email to `ADMIN_EMAILS`, or update the row in `public.users` to `role = 'admin'`.
6. Configure Auth URL settings for your current environment.
7. Create Stripe products and prices that match the SafeKey catalog, then add the Stripe keys and price IDs to `.env.local`.
8. Configure the Stripe webhook endpoint to point at `/api/stripe/webhook`.

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
node scripts/test-auth-flow.cjs
node scripts/test-landlord-protection-flow.cjs
node scripts/test-demo-routes.cjs
```

The test scripts can also read overridden environment variables from the shell, which is useful for validating a production-style `next start` instance on a different port.

## Deployment

The production deployment target is `https://getsafekey.app`.

Use the Vercel deployment guide in `docs/vercel-deployment.md` for:

- exact Vercel project setup
- exact required environment variables
- exact Supabase redirect URLs
- production auth callback checks
- final launch checklist

## Documentation

- [Vercel deployment](./docs/vercel-deployment.md)
- [SafeKey Insurance Lab](./docs/safekey-insurance-lab/README.md) — research and institutional architecture (not production)

## Notes

- Upload links are hashed and stored in Postgres.
- If `OPENAI_API_KEY` is missing, SafeKey falls back to a deterministic heuristic report generator.
- The current tenant document upload flow posts files through a server action. This is fine locally, but large document uploads are a known deployment consideration on Vercel. See `docs/vercel-deployment.md`.
- Stripe billing depends on webhook delivery for durable subscription, invoice, and payment state. The webhook secret and price IDs must be configured in every environment.
