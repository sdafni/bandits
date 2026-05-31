# SafeKey Monetization Architecture

This document describes where monetization logic lives and how to switch between funnels without rewriting UI screens.

## Modes

| `MONETIZATION_MODE` | Funnel |
|---------------------|--------|
| `PREPAY` (default) | Plan → Upload Link → Upload → Analysis → Report |
| `REPORT_UNLOCK` | Upload Link → Upload → Analysis → Report Ready → Unlock Payment |

**Production today uses `PREPAY`.** Do not switch modes in production until Mode B is explicitly tested.

## Configuration sources (priority order)

1. **Database** — `platform_settings` row with key `monetization` (admin UI: `/admin/settings`)
2. **Legacy DB key** — `billing_funnel` (auto-migrated on read; supports old `plan_first` / `report_unlock` values)
3. **Environment** — `MONETIZATION_MODE=PREPAY` or `MONETIZATION_MODE=REPORT_UNLOCK`
4. **Code default** — `DEFAULT_MONETIZATION_CONFIG` in `src/lib/monetization/types.ts`

## Where logic lives

```
src/lib/monetization/
├── types.ts        # MonetizationMode, gate definitions, presets, parsing
├── policy.ts       # Gate evaluation (pure functions — no UI, no Stripe)
├── permissions.ts  # Semantic permissions for UI (canCreateUploadLink, etc.)
├── actions.ts      # Server action → gate mapping
└── index.ts        # Public exports

src/lib/platform-settings.ts      # Load/save config from Supabase (server-only)
src/lib/billing-entitlements.ts   # Resolve entitlements + permissions per landlord/check
src/lib/workspace-access.ts       # Maps workspace capabilities → gates (server-side)
```

### UI rule

**Screens must only use `MonetizationPermissionsSnapshot`.** Never import gate keys or Stripe fields in components.

```typescript
// ✅ UI
monetizationPermissions.canCreateUploadLink
monetizationPermissions.shouldPromptPlanBeforeUploadLink

// ❌ UI — do not use
config.gates.create_upload_link
entitlements.hasActiveSubscription
```

### Server rule

**Actions and API routes must use `assertMonetizationGateForCheck()`** — never inline `hasBillingAccess` or subscription checks.

```typescript
const result = await assertMonetizationGateForCheck({
  checkId,
  gate: "create_upload_link",
  landlordId: profile.id,
});
if (!result.allowed) { /* handle block reason */ }
```

## Gate reference

| Gate | Typical PREPAY requirement | Typical REPORT_UNLOCK requirement |
|------|---------------------------|-----------------------------------|
| `create_upload_link` | subscription_or_per_check | free |
| `tenant_upload` | free | free |
| `run_analysis` | subscription_or_per_check | free |
| `view_report` | subscription_or_per_check | per_report_unlock |

Gate requirements are configurable per gate in admin settings for A/B experiments.

## Switching modes (future)

1. Apply Supabase migrations (`202605310001`, `202605310002`)
2. Open `/admin/settings`
3. Select `REPORT_UNLOCK`, check “Apply mode preset gates”, save
4. Or set `MONETIZATION_MODE=REPORT_UNLOCK` in Vercel for infra-level override

No screen changes required — permissions recompute from config.

## A/B testing (future)

- Store mode per cohort in `platform_settings` or a future `experiments` table
- Resolve config in `getMonetizationConfig()` based on landlord cohort
- UI and actions unchanged — they already consume `MonetizationPermissionsSnapshot`

## Deprecated aliases

`src/lib/billing-funnel/` re-exports from `@/lib/monetization` for backward compatibility. New code should import from `@/lib/monetization` only.
