# SafeKey Investor Demo Walkthrough

## Before you present
1. Sign in as landlord at `/login`.
2. Open `/demo` for the guided narrative and quick links.
3. Confirm the dashboard shows the curated portfolio banner and merged case board.

## Recommended live flow (12–15 minutes)

### 1. Problem framing (landing page)
- Show `/` unauthenticated.
- Highlight pain points: uncertainty, expat verification, late protection decisions.
- Emphasize Greece-specific trust signals and Tenant Passport Greece positioning.

### 2. Landlord workspace
- Open `/dashboard`.
- Point to investor demo banner and operational metrics (now fed by presentation cases).
- Walk through case board filters: awaiting upload, under review, completed.

### 3. Pipeline states
- **Pending upload:** `/dashboard/checks/demo-expat-pending` + `/upload/demo-expat-pending-token`
- **Documents received:** `/dashboard/checks/demo-documents-received`
- **Under review:** `/admin/review/demo-under-review`

### 4. Decision outcomes
- **Approved:** `/dashboard/checks/demo-approved-tenant` (score 91, protection eligible)
- **Conditional:** `/admin/review/demo-conditional-tenant`
- **Declined:** `/dashboard/checks/demo-high-risk-tenant`

### 5. Analyst desk
- Open `/admin/review` and show merged queue.
- Open conditional case, show documents, AI report, protection override form.

### 6. Billing layer
- Open `/dashboard/billing`.
- Explain subscription vs one-time screening using presentation payment history on dashboard.

## Key talking points
- SafeKey is operational infrastructure, not a document inbox.
- Screening → risk score → eligibility → protection packaging is the monetization arc.
- Demo portfolio works without seeding production Supabase data.

## URLs to bookmark
| Step | URL |
|------|-----|
| Guided hub | `/demo` |
| Dashboard | `/dashboard` |
| Admin desk | `/admin/review` |
| Approved case | `/dashboard/checks/demo-approved-tenant` |
| Expat pending | `/upload/demo-expat-pending-token` |
