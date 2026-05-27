# Copies STRIPE_SCREENING_ID -> STRIPE_SCREENING_PRICE_ID in Vercel Production/Preview
# when only the legacy name exists. Requires an interactive Vercel CLI session.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$legacy = "STRIPE_SCREENING_ID"
$canonical = "STRIPE_SCREENING_PRICE_ID"

Write-Host "Checking Vercel env names..."
npx vercel env ls production | Select-String "STRIPE_SCREENING"

Write-Host ""
Write-Host "If $canonical is missing, add it in Vercel with the SAME value as $legacy."
Write-Host "Dashboard: Project safekey -> Settings -> Environment Variables -> Production"
Write-Host "Or run: npx vercel env add $canonical production"
Write-Host "(Code also accepts $legacy as a fallback until renamed.)"
