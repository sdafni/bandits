/**
 * Build manual review pack — current hero + top 5 Google candidates per Athens venue.
 * NO database writes. Output powers artifacts/venue-hero-review/index.html
 *
 *   node scripts/build-venue-hero-review-pack.mjs
 *   LIMIT=20 node scripts/build-venue-hero-review-pack.mjs   # smoke test
 *   RESUME=1 node scripts/build-venue-hero-review-pack.mjs     # continue partial
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PLACES_NEW_BASE = 'https://places.googleapis.com/v1/places';
const GET_MASK = 'id,displayName,formattedAddress,photos,businessStatus';
const SEARCH_MASK =
  'places.id,places.displayName,places.formattedAddress,places.photos,places.businessStatus';
const OUT_DIR = path.join(process.cwd(), 'artifacts/venue-hero-review');
const OUT_JSON = path.join(OUT_DIR, 'review-data.json');
const PARTIAL_JSON = path.join(OUT_DIR, 'review-data.partial.json');
const TOP_N = 5;

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

function encodeSegments(name) {
  return String(name ?? '')
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function buildMediaUrl(apiKey, resourceName) {
  const enc = encodeSegments(String(resourceName ?? '').trim());
  if (!enc) return null;
  return `https://places.googleapis.com/v1/${enc}/media?maxWidthPx=1200&maxHeightPx=900&key=${encodeURIComponent(apiKey)}`;
}

function classifyHero(url) {
  const u = String(url ?? '').trim();
  if (!u) return 'empty';
  if (u.includes('pexels.com')) return 'stock_pexels';
  if (u.includes('picsum') || u.includes('unsplash')) return 'stock_other';
  if (u.includes('supabase.co/storage')) return 'stored_upload';
  if (u.includes('places.googleapis.com')) return 'google';
  return 'other';
}

function photoIdFromUrl(url) {
  const m = String(url ?? '').match(/\/photos\/([^/]+)\//);
  return m?.[1] ?? null;
}

/** Mid-gallery bias: photo 0 is often logo/menu; prefer 2, then 1, then 3… */
function preferredCandidateIndex(count) {
  if (count <= 0) return null;
  if (count >= 3) return 2;
  if (count >= 2) return 1;
  return 0;
}

function buildRecommendation(currentUrl, candidates, googlePlaceId) {
  const currentType = classifyHero(currentUrl);
  const n = candidates.length;

  if (n === 0) {
    return {
      action: 'keep_current',
      candidateIndex: null,
      why: 'No Google Places photos available for this listing. Keep the existing hero unchanged.',
    };
  }

  const pref = preferredCandidateIndex(n);
  const currentPid = photoIdFromUrl(currentUrl);
  const currentIsGoogle = currentType === 'google';

  if (currentIsGoogle && currentPid) {
    const sameAsCandidate = candidates.findIndex((c) => c.photoId === currentPid);
    if (sameAsCandidate >= 0) {
      return {
        action: 'keep_current',
        candidateIndex: sameAsCandidate,
        why: 'Current hero already uses one of the top Google gallery photos. Keep unless another candidate clearly shows the venue better (exterior or iconic interior).',
      };
    }
    return {
      action: 'keep_current',
      candidateIndex: null,
      why: 'Current hero is already a Google Business photo. Do not replace unless a candidate is visually stronger — prefer exterior or recognizable atmosphere over logos and food close-ups.',
    };
  }

  if (currentType === 'empty' || currentType.startsWith('stock')) {
    return {
      action: 'use_candidate',
      candidateIndex: pref,
      why: `Current hero is ${currentType === 'empty' ? 'missing (category fallback in app)' : 'generic stock'}. Candidate ${pref + 1} is suggested as a starting point — often less logo-heavy than photo 1. Confirm it shows the real venue before approving.`,
    };
  }

  if (currentType === 'stored_upload') {
    return {
      action: 'use_candidate',
      candidateIndex: pref,
      why: 'Current hero is a batch/PDF upload, not a verified venue photo. Candidate ' + (pref + 1) + ' is suggested pending your visual check against exterior or iconic interior criteria.',
    };
  }

  return {
    action: 'keep_current',
    candidateIndex: pref,
    why: 'Review all candidates visually. Keep the current hero unless a Google photo clearly represents the venue better.',
  };
}

async function getPlace(apiKey, placeId) {
  const resp = await fetch(`${PLACES_NEW_BASE}/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': GET_MASK },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return { error: json?.error?.message ?? `HTTP ${resp.status}` };
  return { place: json };
}

async function searchPlace(apiKey, textQuery) {
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_MASK,
    },
    body: JSON.stringify({ textQuery, languageCode: 'en', regionCode: 'GR' }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return { error: json?.error?.message ?? `HTTP ${resp.status}`, places: [] };
  return { places: Array.isArray(json?.places) ? json.places : [] };
}

function resolveApiKey() {
  loadEnvFile(path.join(process.cwd(), '.env'));
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env.development.local'), true);
  let key = String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '').trim();
  if (!key) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
      key = String(j?.expo?.extra?.googleMapsApiKey ?? '').trim();
    } catch {
      /* ignore */
    }
  }
  const fallback = 'AIzaSyDSzrKrLTMkbo2Zy4BE49XRfHETfyxChqQ';
  return key || fallback;
}

async function fetchCandidates(apiKey, row) {
  let placeId = String(row.google_place_id ?? '').trim() || null;
  let place = null;
  let lookupError = null;

  if (placeId) {
    const det = await getPlace(apiKey, placeId);
    if (det.error) lookupError = det.error;
    else place = det.place;
  }

  if (!place) {
    const q = [row.name, row.address, 'Athens Greece'].filter(Boolean).join(' ');
    const sr = await searchPlace(apiKey, q);
    if (sr.error) lookupError = lookupError ?? sr.error;
    const top = sr.places?.[0];
    if (top?.id) {
      placeId = top.id;
      if (Array.isArray(top.photos) && top.photos.length) {
        place = top;
      } else {
        const det = await getPlace(apiKey, placeId);
        if (!det.error) place = det.place;
        else lookupError = det.error;
      }
    }
  }

  const photos = Array.isArray(place?.photos) ? place.photos : [];
  const candidates = [];
  for (let i = 0; i < Math.min(TOP_N, photos.length); i++) {
    const url = buildMediaUrl(apiKey, photos[i]?.name);
    if (!url) continue;
    candidates.push({
      index: i,
      label: `Google photo ${i + 1}`,
      photoId: photoIdFromUrl(url),
      previewUrl: url,
    });
  }

  return {
    googlePlaceId: placeId,
    googleDisplayName: place?.displayName?.text ?? null,
    googleAddress: place?.formattedAddress ?? null,
    lookupError,
    candidates,
  };
}

async function main() {
  for (const f of ['.env', '.env.local']) loadEnvFile(path.join(process.cwd(), f));
  loadEnvFile(path.join(process.cwd(), '.env.development.local'), true);

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sbKey) {
    console.error('Need EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const apiKey = resolveApiKey();
  const sb = createClient(url, sbKey, { auth: { persistSession: false } });
  const { data: rows, error } = await sb
    .from('event')
    .select('id,name,address,google_place_id,image_url,genre')
    .eq('city', 'Athens')
    .order('name');
  if (error) throw error;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const resume = String(process.env.RESUME ?? '').trim() === '1';
  const limitNew = Number(process.env.LIMIT ?? 0) || Infinity;
  let existing = [];
  if (resume && fs.existsSync(PARTIAL_JSON)) {
    existing = JSON.parse(fs.readFileSync(PARTIAL_JSON, 'utf8')).venues ?? [];
  }
  const doneIds = new Set(existing.map((v) => v.eventId));
  const venues = [...existing];

  let processed = 0;
  for (const row of rows ?? []) {
    if (doneIds.has(row.id)) continue;
    if (processed >= limitNew) break;

    const currentUrl = String(row.image_url ?? '').trim() || null;
    const fetched = await fetchCandidates(apiKey, row);
    const rec = buildRecommendation(currentUrl, fetched.candidates, fetched.googlePlaceId);

    venues.push({
      eventId: row.id,
      venueName: row.name,
      genre: row.genre ?? null,
      address: row.address ?? null,
      currentHero: {
        previewUrl: currentUrl,
        type: classifyHero(currentUrl),
        googlePlaceId: row.google_place_id ?? null,
      },
      googleListing: {
        placeId: fetched.googlePlaceId,
        displayName: fetched.googleDisplayName,
        address: fetched.googleAddress,
        lookupError: fetched.lookupError,
      },
      candidates: fetched.candidates,
      recommendation: rec,
      reviewStatus: 'pending',
    });

    doneIds.add(row.id);
    processed += 1;

    if (processed % 10 === 0) {
      fs.writeFileSync(
        PARTIAL_JSON,
        JSON.stringify({ generatedAt: new Date().toISOString(), partial: true, venues }, null, 2),
      );
      console.log(`… checkpoint ${venues.length}/${rows.length}`);
    }
    await new Promise((r) => setTimeout(r, 180));
  }

  venues.sort((a, b) => a.venueName.localeCompare(b.venueName));

  const pack = {
    generatedAt: new Date().toISOString(),
    mode: 'MANUAL REVIEW ONLY — no database writes from this pack',
    rules: [
      'Pick best hero: exterior > iconic interior > atmosphere',
      'Avoid logos, food-only, visitors, stock, duplicates',
      'Never replace if current hero is already better',
      'Leave unchanged if no candidate improves the venue',
    ],
    totalVenues: venues.length,
    venues,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(pack, null, 2));
  if (fs.existsSync(PARTIAL_JSON)) fs.unlinkSync(PARTIAL_JSON);
  console.log(`Wrote ${OUT_JSON} (${venues.length} venues)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
