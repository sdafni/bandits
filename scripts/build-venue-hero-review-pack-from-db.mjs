/**
 * Fast review pack — duplicate resolver + live Places lookup for orphans (no DB writes).
 *   node scripts/build-venue-hero-review-pack-from-db.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildVenueGoogleResolution, parseGallery } from './lib/venueGoogleResolver.mjs';
import {
  buildSearchQuery,
  candidatesFromPlace,
  createLookupStats,
  resolvePlaceIdForVenue,
  resolveServerPlacesApiKey,
} from './lib/placesLookup.mjs';

const OUT_DIR = path.join(process.cwd(), 'artifacts/venue-hero-review');
const OUT_JSON = path.join(OUT_DIR, 'review-data.json');
const RESOLUTION_JSON = path.join(OUT_DIR, 'venue-google-resolution.json');
const LOOKUP_CACHE_JSON = path.join(OUT_DIR, 'places-lookup-cache.json');
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

function preferredCandidateIndex(count) {
  if (count <= 0) return null;
  if (count >= 3) return 2;
  if (count >= 2) return 1;
  return 0;
}

function buildRecommendation(currentUrl, candidates) {
  const currentType = classifyHero(currentUrl);
  const n = candidates.length;
  if (n === 0) {
    return {
      action: 'keep_current',
      candidateIndex: null,
      why: 'No Google Places photo candidates available. Keep existing hero unless you verify via lightbox.',
    };
  }
  const pref = preferredCandidateIndex(n);
  const currentPid = photoIdFromUrl(currentUrl);
  if (currentType === 'google' && currentPid) {
    const same = candidates.findIndex((c) => c.photoId === currentPid);
    if (same >= 0) {
      return {
        action: 'keep_current',
        candidateIndex: same,
        why: 'Current hero matches a gallery photo. Keep unless another candidate clearly shows the venue better (exterior or iconic interior).',
      };
    }
    return {
      action: 'keep_current',
      candidateIndex: null,
      why: 'Current hero is already Google Business. Do not replace unless a candidate is visually stronger.',
    };
  }
  if (currentType === 'empty' || currentType.startsWith('stock')) {
    return {
      action: 'use_candidate',
      candidateIndex: pref,
      why: `Current hero is ${currentType === 'empty' ? 'missing' : 'generic stock'}. Candidate ${pref + 1} suggested — verify exterior/atmosphere, not logo or food close-up.`,
    };
  }
  if (currentType === 'stored_upload') {
    return {
      action: 'use_candidate',
      candidateIndex: pref,
      why: `Current is PDF/batch upload. Candidate ${pref + 1} suggested pending visual check.`,
    };
  }
  return {
    action: 'keep_current',
    candidateIndex: pref,
    why: 'Compare visually. Keep current unless a Google candidate clearly represents this venue better.',
  };
}

function googleCandidatesFromUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const url of urls) {
    const u = String(url ?? '').trim();
    if (!u.includes('places.googleapis.com')) continue;
    const pid = photoIdFromUrl(u);
    if (pid && seen.has(pid)) continue;
    if (pid) seen.add(pid);
    out.push({
      index: out.length,
      label: `Gallery photo ${out.length + 1}`,
      photoId: pid,
      previewUrl: u,
    });
    if (out.length >= TOP_N) break;
  }
  return out;
}

for (const f of ['.env', '.env.local']) loadEnvFile(path.join(process.cwd(), f));
loadEnvFile(path.join(process.cwd(), '.env.development.local'), true);

const apiKey = resolveServerPlacesApiKey();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await sb
  .from('event')
  .select('id,name,address,genre,google_place_id,image_url,image_gallery,location_lat,location_lng')
  .eq('city', 'Athens')
  .order('name');
if (error) throw error;

const { resolutionByEventId, clusters } = buildVenueGoogleResolution(rows ?? []);

// Live Places lookup for rows still missing place_id after duplicate resolution
const lookupCache = {};
const lookupStats = createLookupStats();
const unresolved = (rows ?? []).filter((r) => !resolutionByEventId.get(r.id)?.resolvedPlaceId);
console.log(`Duplicate resolver: ${rows.length} venues, ${unresolved.length} still need live Places lookup`);

for (const row of unresolved) {
  const result = await resolvePlaceIdForVenue(row, apiKey, lookupStats);
  if (result.placeId) {
    lookupCache[row.id] = {
      placeId: result.placeId,
      lookupMethod: result.lookupMethod,
      searchQuery: result.searchQuery ?? buildSearchQuery(row),
      googleName: result.place?.displayName?.text ?? null,
      photoCount: Array.isArray(result.place?.photos) ? result.place.photos.length : 0,
      cachedAt: new Date().toISOString(),
    };
    const existing = resolutionByEventId.get(row.id);
    resolutionByEventId.set(row.id, {
      ...existing,
      eventId: row.id,
      venueName: row.name,
      ownPlaceId: row.google_place_id ?? null,
      resolvedPlaceId: result.placeId,
      resolvedGalleryUrls: existing?.resolvedGalleryUrls ?? [],
      source: 'places_api_search',
      sourceEventId: row.id,
      inheritedFrom: null,
      clusterKey: existing?.clusterKey ?? row.id,
      clusterSize: existing?.clusterSize ?? 1,
      placeIdConflict: false,
      conflictingPlaceIds: [],
      liveSearchQuery: result.searchQuery,
    });
  }
  await new Promise((r) => setTimeout(r, 150));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  LOOKUP_CACHE_JSON,
  JSON.stringify({ generatedAt: new Date().toISOString(), stats: lookupStats, byEventId: lookupCache }, null, 2),
);

let inheritedCount = 0;
let liveLookupCount = 0;
const venues = (rows ?? []).map((row) => {
  const currentUrl = String(row.image_url ?? '').trim() || null;
  const resolution = resolutionByEventId.get(row.id);
  const resolvedPlaceId = resolution?.resolvedPlaceId ?? row.google_place_id ?? null;
  const galleryFromCluster = resolution?.resolvedGalleryUrls ?? [];
  const localGallery = parseGallery(row.image_gallery);
  const allUrls = [...galleryFromCluster, ...(currentUrl ? [currentUrl] : []), ...localGallery];
  let candidates = googleCandidatesFromUrls(allUrls);

  // If we have place_id but no gallery URLs, candidates come from live API via server proxy (index 0-4)
  // Store metadata so UI knows photos are available
  const rec = buildRecommendation(currentUrl, candidates);

  if (resolution?.source === 'sibling' || resolution?.source === 'cluster_canonical') inheritedCount++;
  if (resolution?.source === 'places_api_search') liveLookupCount++;

  let lookupError = null;
  if (!resolvedPlaceId) {
    lookupError = resolution?.liveSearchQuery
      ? 'Places text search returned no match'
      : 'No google_place_id after duplicate resolution + live search';
  }

  return {
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
      placeId: resolvedPlaceId,
      ownPlaceId: row.google_place_id ?? null,
      displayName: row.name,
      address: row.address ?? null,
      lookupError,
      resolution: resolution
        ? {
            source: resolution.source,
            inheritedFrom: resolution.inheritedFrom,
            clusterKey: resolution.clusterKey,
            clusterSize: resolution.clusterSize,
            placeIdConflict: resolution.placeIdConflict,
            liveSearchQuery: resolution.liveSearchQuery ?? lookupCache[row.id]?.searchQuery ?? null,
          }
        : null,
    },
    candidates,
    recommendation: rec,
    reviewStatus: 'pending',
  };
});

const multiClusters = clusters.filter((c) => c.size > 1);
const withPlaceId = venues.filter((v) => v.googleListing.placeId).length;

fs.writeFileSync(
  RESOLUTION_JSON,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalVenues: venues.length,
      duplicateClusters: multiClusters.length,
      inheritedPlaceIds: inheritedCount,
      livePlacesLookups: liveLookupCount,
      lookupStats,
      withResolvedPlaceId: withPlaceId,
      clusters: multiClusters,
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: 'MANUAL REVIEW ONLY — no database writes',
      source: 'database + duplicate resolver + live Places API for orphans',
      totalVenues: venues.length,
      withResolvedPlaceId: withPlaceId,
      withCandidates: venues.filter((v) => v.candidates.length > 0).length,
      inheritedFromSiblings: inheritedCount,
      livePlacesLookups: liveLookupCount,
      venues,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${OUT_JSON}: ${venues.length} venues`);
console.log(`  resolved place_id: ${withPlaceId}/${venues.length}`);
console.log(`  inherited from sibling: ${inheritedCount}`);
console.log(`  live Places search: ${liveLookupCount}`);
console.log(`  API stats:`, lookupStats.byStatus);
console.log(`Wrote ${LOOKUP_CACHE_JSON}`);
