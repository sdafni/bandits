# SafeKey Vercel Deployment

Production target: `https://getsafekey.app`

## 1. Vercel Project Setup

1. Open Vercel and create a new project from the SafeKey repository.
2. Keep the framework preset as `Next.js`.
3. Keep the root directory as the repository root.
4. Do not override the build command unless you have a specific need. Use:
   - Build command: `npm run build`
   - Install command: `npm install`
   - Output setting: Next.js default
5. Add the production environment variables listed below before the first production deploy.
6. Deploy once to generate the Vercel production URL.
7. Add the custom domain `getsafekey.app`.
8. If you want a canonical redirect strategy, make `getsafekey.app` primary and redirect `www.getsafekey.app` to the apex domain.

## 2. Required Vercel Environment Variables

Add these in Vercel for the `Production` environment:

```bash
NEXT_PUBLIC_APP_URL=https://getsafekey.app
NEXT_PUBLIC_SITE_URL=https://getsafekey.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SECRET_KEY
ADMIN_EMAILS=admin@getsafekey.app
```

Optional:

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

Notes:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are interchangeable in the current codebase. At least one must be set.
- `SUPABASE_SERVICE_ROLE_KEY` is required for admin workflows, profile bootstrap, secure upload processing, and document review flows.
- `OPENAI_API_KEY` is optional. Without it, SafeKey falls back to deterministic heuristic reporting.

## 3. Supabase Auth URL Configuration

In Supabase Dashboard -> Authentication -> URL Configuration, set:

- Site URL:
  - `https://getsafekey.app`

- Redirect URLs:
  - `https://getsafekey.app/**`
  - `https://getsafekey.app/auth/callback`
  - `https://getsafekey.app/dashboard`

Recommended if you want Vercel preview deployments to support auth testing:

- `https://*.vercel.app/**`
- `https://*.vercel.app/auth/callback`

## 4. Why Auth Callbacks Are Ready

The current app is already wired for production auth callbacks:

- signup confirmation emails use `emailRedirectTo` derived from `NEXT_PUBLIC_APP_URL`
- `/auth/callback` handles both URL hash session tokens and code-based auth callbacks
- `/auth/callback/session` sets the Supabase session cookies on the server
- middleware refreshes Supabase sessions for protected routes

For production, the important requirement is that Vercel env vars and Supabase redirect URLs match `https://getsafekey.app`.

## 5. Build Compatibility

SafeKey is compatible with Vercel's standard Next.js deployment model:

- `npm run build` passes
- `next.config.ts` is Vercel-safe
- security headers are configured in Next.js
- session middleware is configured
- metadata and canonical URL handling use `NEXT_PUBLIC_SITE_URL`

## 6. Production Smoke Test After Deploy

Run this exact sequence after the first production deployment:

1. Open `https://getsafekey.app`
2. Open `/login`
3. Create a brand new landlord account
4. Confirm the email
5. Verify the callback returns to SafeKey, not another project
6. Sign in
7. Sign out
8. Sign back in
9. Create a tenant check
10. Open the generated upload link
11. Upload a small document set
12. Verify the landlord case updates
13. Open the admin review queue
14. Open the review detail page
15. Verify:
    - risk score
    - recommendation
    - protection eligibility
    - package assignment
16. Repeat a quick visual check on:
    - iPhone width
    - Android width
    - tablet width

## 7. Mobile Production Check

Validate these routes on production:

- `/login`
- `/dashboard`
- `/dashboard/checks/[id]`
- `/upload/[token]`
- `/admin/review`
- `/admin/review/[id]`

What to confirm:

- no horizontal overflow
- auth card stays readable
- dashboard cards stack cleanly
- upload flow remains tappable and readable
- protection cards remain legible
- admin review controls remain usable on touch widths

## 8. Remaining Blocker

There is one material deployment blocker for full production confidence on Vercel:

- The current tenant document upload flow posts files through a Next.js Server Action.
- Vercel Functions currently enforce a request body size limit of about `4.5 MB`.
- SafeKey currently allows uploads up to `10 MB` per file and multiple files per submission.

Impact:

- large tenant uploads may fail in production with `413 FUNCTION_PAYLOAD_TOO_LARGE`
- `experimental.serverActions.bodySizeLimit` in `next.config.ts` does not remove Vercel's platform-level request cap

Recommended fix:

1. move tenant file uploads to direct-to-storage uploads
2. generate short-lived signed upload URLs from the server
3. upload files directly from the browser to Supabase Storage
4. notify the app server after upload completion so database rows and review state can be updated

Status:

- SafeKey is ready for Vercel deployment for auth, dashboard, admin review, and product navigation
- SafeKey is not yet fully production-safe for larger tenant document uploads on Vercel until the upload path is changed to direct-to-storage

## 9. Final Launch Checklist

- [ ] Vercel project created
- [ ] Production env vars added
- [ ] Custom domain `getsafekey.app` added in Vercel
- [ ] Supabase Site URL set to `https://getsafekey.app`
- [ ] Supabase Redirect URLs added
- [ ] Supabase storage bucket confirmed
- [ ] At least one admin email added to `ADMIN_EMAILS`
- [ ] First production deploy completed
- [ ] Signup, login, logout verified on production
- [ ] Auth email callback verified on production
- [ ] Dashboard flow verified on production
- [ ] Tenant upload flow tested with small files
- [ ] Admin review flow verified on production
- [ ] Mobile responsive smoke test completed
- [ ] Direct-to-storage upload refactor scheduled before scaling document-heavy usage
