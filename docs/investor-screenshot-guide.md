# Investor Screenshot & Export Guide

## Recommended captures (1440×900 or 1920×1080)

### Website / deck
1. Landing hero — `/` (unauthenticated)
2. Pain points + Greece trust section — scroll on `/`
3. Pricing section — `/#pricing`
4. Login with platform preview — `/login`

### Product / investor deck
5. Guided demo hub — `/demo`
6. Landlord dashboard with case board — `/dashboard`
7. Approved AI report — `/dashboard/checks/demo-approved-tenant`
8. Conditional admin review — `/admin/review/demo-conditional-tenant`
9. Declined case — `/dashboard/checks/demo-high-risk-tenant`
10. Expat pending upload — `/upload/demo-expat-pending-token`
11. Billing workspace — `/dashboard/billing`

### Social / onboarding
12. Mobile dashboard — resize browser to 390px width, `/dashboard`
13. Case card close-up — crop from dashboard board
14. Trust footer — bottom of `/` or `/privacy`

## How to capture
1. Use production or local with `NEXT_PUBLIC_APP_URL` set correctly.
2. Hide browser extensions and use light mode (SafeKey is light-first).
3. Capture at 2× resolution for retina decks.
4. Store exports in `public/investor/exports/` (create per shoot).

## Naming convention
```
safekey-{surface}-{feature}-{state}.png
```
Examples:
- `safekey-dashboard-caseboard-demo.png`
- `safekey-report-approved-tenant.png`
- `safekey-landing-hero-trust.png`

## Brand assets
Existing brand files: `public/brand/safekey/`
- Logo, lockup, icon, hero grid, UI visuals
