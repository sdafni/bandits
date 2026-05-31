# Supabase Auth Email Branding (Production)

Apply these settings in Supabase Dashboard to remove generic "Supabase Auth" onboarding emails.

## Auth Email Sender

1. Open Supabase Project -> Authentication -> Email Templates / SMTP.
2. Set sender name to: `SafeKey`
3. Set reply-to / contact email to: `blonje@gmail.com`
4. Configure SMTP domain sender in production (recommended) so sender is not generic.
5. Disable or replace any footer that shows "Supabase Auth" or "Powered by Supabase".

## Password Reset Email Template

1. Open template: **Reset password**.
2. Set subject: `Reset your SafeKey password`
3. Replace HTML body with: `supabase/auth-email/recovery.html`
4. CTA must use token-hash callback format:
   - `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/login/reset-password&email={{ .Email }}`

## Magic Link Email Template

1. Open template: **Magic link**.
2. Set subject: `Sign in to SafeKey`
3. Replace HTML body with: `supabase/auth-email/magic-link.html`
4. CTA must use token-hash callback format:
   - `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/dashboard&email={{ .Email }}`

## Confirmation Email Template

1. Open template: **Confirm signup**.
2. Set subject:
   - `Welcome to SafeKey — Confirm Your Account`
3. Replace HTML body with:
   - `supabase/auth-email/confirm-signup.html`
   - Uses token-hash callback URL format (no PKCE browser verifier dependency):
   - `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard&email={{ .Email }}`
4. Save and send a test email in:
   - Gmail Android
   - Apple Mail (iPhone)
   - Outlook
   - dark mode

## Required Content Rules

- Remove all Supabase branding text and footer.
- CTA text must be: `Confirm Your SafeKey Account`.
- Keep institutional tone and trust language.
- Keep footer:
  - `SafeKey`
  - `Know Who Gets the Key.`
  - `support@getsafekey.app`

## Greek-first Rollout

Supabase default templates are single-template per email type. For Greek-first localization:

1. Start with an English institutional template (current file).
2. Add Greek variant in a second template file and switch based on project locale policy.
3. If per-user locale email is required, move confirmation flow to custom mail pipeline with locale-aware templates.
