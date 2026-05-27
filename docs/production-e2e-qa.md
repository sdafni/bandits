# SafeKey Production E2E Operational QA

Soft-launch checklist for **https://getsafekey.app**. Run after every production deploy and before onboarding the first paying landlord.

## Automated gates

```bash
npm run lint
npm run build
node scripts/verify-production-ready.cjs --url https://getsafekey.app
```

With a running app and `.env.local` credentials:

```bash
npm run start
node scripts/production-qa-review.cjs
```

## Environment prerequisites

| Variable | Required for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth, RLS client |
| `SUPABASE_SERVICE_ROLE_KEY` | Uploads, webhooks, admin repair |
| `STRIPE_SECRET_KEY` + 4 price IDs | Checkout |
| `STRIPE_WEBHOOK_SECRET` | Subscription sync, payment history |
| `ADMIN_EMAILS` | Analyst/admin access |
| `RESEND_API_KEY`, `SAFEKEY_EMAIL_FROM` | Tenant invitation email (optional; manual link copy otherwise) |
| `OPENAI_API_KEY` | AI report generation |

Health endpoints (no secrets exposed):

- `GET /api/health/stripe`
- `GET /api/health/production`

Supabase migrations through `202605280002` (webhook idempotency) and `202605280001` (landlord-only signup role).

---

## 1. Authentication

| Step | Expected |
| --- | --- |
| Sign up at `/login` | Landlord profile created; redirect to dashboard or billing intent |
| Sign in | Session persists after refresh; logout clears session |
| Forgot password `/login/forgot-password` | Email received; link opens `/login/reset-password` |
| Protected routes | `/dashboard/*` and `/admin/*` redirect to `/login?next=...` when logged out |
| Open redirect | `//evil.com` in `next` must land on `/dashboard`, not external URL |
| RLS | Landlord cannot read another landlord's `tenant_checks`; admin can read queue |

**Script:** `node scripts/test-auth-flow.cjs`

---

## 2. Tenant upload flow

| Step | Expected |
| --- | --- |
| Create case (dashboard) | Secure token URL generated; optional email if Resend configured |
| Open `/upload/[token]` | Form loads; checklist shows requested documents |
| Upload PDF/image | Files in `tenant-documents` bucket; `tenant_documents` rows created |
| Status | `pending_upload` → `documents_received` after batch |
| Landlord view | Case visible on dashboard with document count |
| Analyst view | Case appears in `/admin/review` queue |
| Demo token | Server rejects writes with read-only message |
| Completed case | `report_ready` blocks further uploads |

---

## 3. Stripe production flow

| Step | Expected |
| --- | --- |
| Billing page | No “missing keys” banner when checkout ready |
| Subscription checkout | Stripe Checkout → success URL; `subscriptions` row updated via webhook |
| Screening one-time | Payment recorded; case/report gating respects credits |
| Webhook | `stripe_webhook_events` dedupes; failed events logged |
| Customer portal | Opens from billing page for active subscriber |

**Manual:** `docs/billing-qa-checklist.md`, `docs/stripe-deployment-checklist.md`

**Blocker if missing:** `STRIPE_WEBHOOK_SECRET` on Vercel — checkout works but subscription state may drift.

---

## 4. Email workflows

| Workflow | Status |
| --- | --- |
| Tenant invitation (create case) | Sent when `RESEND_API_KEY` + `SAFEKEY_EMAIL_FROM` set |
| Upload confirmation | Not automated — verify success message on upload page |
| Review status to landlord | Not automated — verify in-app dashboard + admin actions |
| Analyst assignment | Not automated — use `ADMIN_EMAILS` |

Until transactional email is expanded, copy upload links from the case detail page and confirm delivery manually.

---

## 5. Live case E2E (manual, ~45 min)

1. **Landlord:** New account → create property case with real tenant email.
2. **Tenant:** Open upload link on mobile (Safari + Chrome); submit ID + income proof; accept GDPR consent.
3. **Analyst:** `/admin/review` → open case → generate AI report → set protection recommendation.
4. **Landlord:** View report on case detail; run screening checkout if required.
5. **Billing:** Complete one subscription OR one screening payment in Stripe live/test mode per launch policy.

Record case ID, Stripe session ID, and webhook event IDs in your launch log.

---

## 6. Mobile QA

Devices: iPhone Safari, Android Chrome.

| Area | Check |
| --- | --- |
| Dashboard | No horizontal scroll; KPI grid readable |
| Case table | Rows tap through to detail |
| Upload form | File picker works; checkbox + submit reachable |
| Auth | Tabs, inputs, CTAs ≥ 44px touch targets |
| Billing | Plan cards stack; checkout button full width |

**Script:** `production-qa-review.cjs` (overflow + viewport profiles)

---

## 7. Analyst / admin workflow

| Step | Expected |
| --- | --- |
| Admin login (`ADMIN_EMAILS` or `role=admin`) | Lands on `/admin/review` |
| Queue filters | Pending review vs report-ready |
| Generate report | Billing gate respected; `ai_reports` created |
| Approve / reject protection | `insurance_eligibility` updated; landlord sees snapshot |
| Case visibility | Non-admin cannot access `/admin/*` |

---

## 8. Legal minimum

| Item | Route | Launch note |
| --- | --- | --- |
| Privacy policy | `/privacy` | Replace template with counsel-approved text |
| Terms | `/terms` | Replace template with counsel-approved text |
| GDPR upload consent | Upload checkbox + `/privacy` link | Required before submit |

---

## 9. Stability

| Area | Expected |
| --- | --- |
| Loading | Root, dashboard, admin skeletons |
| Empty states | Dashboard with zero cases; empty review queue |
| Errors | Route-level `error.tsx` with retry on dashboard/admin |
| Upload failure | Partial batch rolled back (storage + DB) |
| Stripe failure | User-visible message; no silent success |

---

## 10. Soft-launch sign-off

All must be true:

- [ ] Production migrations applied
- [ ] `verify-production-ready.cjs` passes against production URL
- [ ] One full live case (section 5) completed
- [ ] Stripe webhook receiving events in Dashboard → Developers → Webhooks
- [ ] Mobile upload verified on two devices
- [ ] Legal pages reviewed (even if still template, tracked as pre-launch debt)
- [ ] On-call contact and Supabase/Stripe dashboard access documented for founder

**Launch status:** Soft-launch ready for first landlord cohort when sections 1–3, 5, 7, and 9 pass; sections 4 and 8 can ship with documented manual steps if agreed with stakeholders.
