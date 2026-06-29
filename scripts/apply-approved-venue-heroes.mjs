/**
 * Apply user-approved venue hero decisions (Google Places + Supabase Storage URLs).
 *
 *   node scripts/prepare-venue-hero-approvals.mjs   # first
 *   node scripts/apply-approved-venue-heroes.mjs    # uses prepared file by default
 *   BACKFILL_DRY_RUN=1 node scripts/apply-approved-venue-heroes.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(envPath, override = false) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (override || !process.env[key]) process.env[key] = value;
  }
}

const ROOT = process.cwd();
for (const f of ['.env', '.env.local']) loadEnvFile(path.join(ROOT, f));
loadEnvFile(path.join(ROOT, '.env.development.local'), true);

const PREPARED = path.join(ROOT, 'artifacts/venue-hero-review/venue-hero-approvals-prepared.json');
const approvalsPath = process.argv[2] ?? PREPARED;
if (!fs.existsSync(approvalsPath)) {
  console.error('Missing prepared approvals. Run: node scripts/prepare-venue-hero-approvals.mjs');
  console.error('Usage: node scripts/apply-approved-venue-heroes.mjs [venue-hero-approvals-prepared.json]');
  process.exit(1);
}

const dryRun = String(process.env.BACKFILL_DRY_RUN ?? '').trim() === '1';
const approvals = JSON.parse(fs.readFileSync(approvalsPath, 'utf8'));
const decisions = Array.isArray(approvals.decisions) ? approvals.decisions : [];

function isApplyableImageUrl(u) {
  const t = String(u ?? '').trim();
  if (!t) return false;
  if (t.includes('places.googleapis.com/v1/places/') && t.includes('/photos/') && t.includes('/media')) return true;
  if (t.includes('supabase.co/storage/v1/object/public/')) return true;
  return false;
}

const toApply = decisions.filter(
  (d) => d.status === 'use_candidate' && isApplyableImageUrl(d.previewUrl) && !d.prepareError,
);

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
let ok = 0;
let fail = 0;

for (const d of toApply) {
  const payload = { image_url: d.previewUrl };
  if (d.googlePlaceId) payload.google_place_id = d.googlePlaceId;

  if (dryRun) {
    const kind = d.previewUrl.includes('supabase.co') ? 'storage' : 'google';
    console.log('[dry]', d.venueName, `(${kind})`, d.googlePlaceId ?? '(no place_id)');
    ok++;
    continue;
  }

  const { error } = await sb.from('event').update(payload).eq('id', d.eventId);
  if (error) {
    console.error('[fail]', d.venueName, error.message);
    fail++;
  } else {
    console.log('[ok]', d.venueName);
    ok++;
  }
}

const skipped = decisions.filter((d) => d.status === 'use_candidate' && !isApplyableImageUrl(d.previewUrl));
if (skipped.length) {
  console.warn(`\nSkipped ${skipped.length} use_candidate rows (missing or non-permanent URL):`);
  for (const s of skipped) console.warn(' -', s.venueName, s.prepareError ?? s.previewUrl ?? '(no url)');
}

console.log(`\n${dryRun ? 'Dry run: ' : ''}${ok}/${toApply.length} approved hero updates applied${fail ? `, ${fail} failed` : ''}`);

if (!dryRun && fail > 0) process.exit(1);
