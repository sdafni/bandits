/**
 * Prepare venue-hero approvals for DB apply:
 * - Resolve Google photo URLs via review server /api/resolve
 * - Upload manual / local press images to Supabase Storage (banditsassets4)
 * - Write artifacts/venue-hero-review/venue-hero-approvals-prepared.json
 *
 *   node scripts/prepare-venue-hero-approvals.mjs [raw-approvals.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const REVIEW_DIR = path.join(ROOT, 'artifacts/venue-hero-review');
const DEFAULT_RAW = path.join(REVIEW_DIR, 'venue-hero-approvals-raw.json');
const DEFAULT_EXPORT = path.join(REVIEW_DIR, 'venue-hero-approvals.json');
const OUT = path.join(REVIEW_DIR, 'venue-hero-approvals-prepared.json');
const REVIEW_DATA = path.join(REVIEW_DIR, 'review-data.json');
const REVIEW_ORIGIN = process.env.REVIEW_ORIGIN ?? 'http://127.0.0.1:3456';
const BUCKET = 'banditsassets4';
const STORAGE_PREFIX = 'venue_heroes/athens';

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

for (const f of ['.env', '.env.local']) loadEnvFile(path.join(ROOT, f));
loadEnvFile(path.join(ROOT, '.env.development.local'), true);

const inputPath = process.argv[2] ?? (fs.existsSync(DEFAULT_EXPORT) ? DEFAULT_EXPORT : DEFAULT_RAW);
if (!fs.existsSync(inputPath)) {
  console.error('Missing approvals file. Run pull or export first:', inputPath);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const pack = JSON.parse(fs.readFileSync(REVIEW_DATA, 'utf8'));
const venueById = new Map(pack.venues.map((v) => [v.eventId, v]));
const rows = [];

function normalizeDecisionRows(raw) {
  if (Array.isArray(raw.decisions)) return raw.decisions;
  const map = raw.decisions && typeof raw.decisions === 'object' ? raw.decisions : raw;
  if (Array.isArray(map)) return map;
  return Object.entries(map).map(([eventId, d]) => ({
    eventId,
    venueName: d?.venueName,
    ...d,
  }));
}

for (const row of normalizeDecisionRows(raw)) {
  const eventId = row.eventId;
  const d = row;
  if (!eventId || !d || typeof d !== 'object' || d.status === 'pending') continue;
  const venue = venueById.get(eventId);
  rows.push({
    eventId,
    venueName: venue?.venueName ?? row.venueName ?? eventId,
    ...d,
    googlePlaceId: d.googlePlaceId ?? venue?.googleListing?.placeId ?? venue?.currentHero?.googlePlaceId ?? null,
  });
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

function isPermanentImageUrl(u) {
  const t = String(u ?? '').trim();
  return (
    t.includes('places.googleapis.com/v1/places/') ||
    (t.includes('supabase.co/storage/v1/object/public/') && !t.includes('127.0.0.1'))
  );
}

function localManualPathFromUrl(u) {
  const t = String(u ?? '').trim();
  try {
    const parsed = new URL(t, REVIEW_ORIGIN);
    if (parsed.pathname.startsWith('/manual/')) return path.join(REVIEW_DIR, parsed.pathname.replace(/^\//, ''));
  } catch {
    /* ignore */
  }
  if (t.startsWith('/manual/')) return path.join(REVIEW_DIR, t.replace(/^\//, ''));
  return null;
}

function contentTypeForFile(filePath) {
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function resolveGooglePhoto(venue, idx) {
  const pid = venue?.googleListing?.placeId ?? venue?.currentHero?.googlePlaceId;
  const q = new URLSearchParams({ index: String(idx) });
  if (venue?.eventId) q.set('eventId', venue.eventId);
  if (pid) q.set('placeId', pid);
  const r = await fetch(`${REVIEW_ORIGIN}/api/resolve?${q}`);
  if (!r.ok) throw new Error(`resolve HTTP ${r.status}`);
  const j = await r.json();
  if (!j.mediaUrl) throw new Error('resolve missing mediaUrl');
  return j.mediaUrl;
}

async function uploadManualImage(eventId, localPath) {
  const ext = path.extname(localPath).slice(1) || 'jpg';
  const objectPath = `${STORAGE_PREFIX}/${eventId}/hero-${Date.now()}.${ext}`;
  const buf = fs.readFileSync(localPath);
  const contentType = contentTypeForFile(localPath);
  const { error } = await sb.storage.from(BUCKET).upload(objectPath, buf, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl?.trim();
  if (!publicUrl) throw new Error('Could not build public URL');
  return publicUrl;
}

const prepared = [];
let uploaded = 0;
let resolved = 0;

for (const row of rows) {
  const venue = venueById.get(row.eventId);
  const out = { ...row };

  if (row.status !== 'use_candidate') {
    prepared.push(out);
    continue;
  }

  let previewUrl = row.previewUrl ?? null;
  const idx = row.candidateIndex ?? 0;

  if (!previewUrl || !isPermanentImageUrl(previewUrl)) {
    const localPath = localManualPathFromUrl(previewUrl);
    if (localPath && fs.existsSync(localPath)) {
      previewUrl = await uploadManualImage(row.eventId, localPath);
      out.previewUrl = previewUrl;
      out.imageSource = 'manual_press_upload';
      uploaded++;
      console.log('[upload]', row.venueName, previewUrl);
    } else if (!previewUrl || previewUrl.includes('/manual/') || previewUrl.includes('127.0.0.1')) {
      const cand = venue?.candidates?.find((c) => c.index === idx) ?? venue?.candidates?.[idx];
      const candLocal = localManualPathFromUrl(cand?.previewUrl ?? '');
      if (candLocal && fs.existsSync(candLocal)) {
        previewUrl = await uploadManualImage(row.eventId, candLocal);
        out.previewUrl = previewUrl;
        out.imageSource = 'manual_press_upload';
        uploaded++;
        console.log('[upload]', row.venueName, '(from candidate)', previewUrl);
      } else {
        previewUrl = await resolveGooglePhoto(venue, idx);
        out.previewUrl = previewUrl;
        out.imageSource = 'google_places_resolve';
        resolved++;
        console.log('[resolve]', row.venueName);
      }
    } else if (!previewUrl?.includes('places.googleapis.com')) {
      try {
        previewUrl = await resolveGooglePhoto(venue, idx);
        out.previewUrl = previewUrl;
        out.imageSource = 'google_places_resolve';
        resolved++;
        console.log('[resolve]', row.venueName);
      } catch (e) {
        console.error('[fail]', row.venueName, e.message);
        out.prepareError = e.message;
      }
    }
  }

  if (row.status === 'use_candidate' && !out.previewUrl) {
    console.error('[skip]', row.venueName, 'no previewUrl after prepare');
    out.prepareError = out.prepareError ?? 'missing previewUrl';
  }

  prepared.push(out);
}

const exportDoc = {
  preparedAt: new Date().toISOString(),
  sourceFile: inputPath,
  note: 'Ready for apply-approved-venue-heroes.mjs',
  stats: {
    total: prepared.length,
    use_candidate: prepared.filter((d) => d.status === 'use_candidate').length,
    keep_current: prepared.filter((d) => d.status === 'keep_current').length,
    skip: prepared.filter((d) => d.status === 'skip').length,
    uploaded,
    googleResolved: resolved,
  },
  decisions: prepared,
};

fs.writeFileSync(OUT, JSON.stringify(exportDoc, null, 2));
console.log('\nWrote', OUT);
console.log('Stats:', exportDoc.stats);

const applyReady = prepared.filter(
  (d) => d.status === 'use_candidate' && d.previewUrl && isPermanentImageUrl(d.previewUrl),
);
const rabbit = applyReady.find((d) => d.venueName === 'The Rabbit Punch');
if (rabbit) console.log('\nRabbit Punch URL:', rabbit.previewUrl);
console.log(`\n${applyReady.length} use_candidate rows ready to apply`);
