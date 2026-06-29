/**
 * Google Places (New) lookup — shared by review pack, server, diagnostics.
 */
const PLACES_NEW_BASE = 'https://places.googleapis.com/v1/places';
const SEARCH_MASK =
  'places.id,places.displayName,places.formattedAddress,places.photos,places.businessStatus';
const GET_MASK = 'id,displayName,formattedAddress,photos,businessStatus';

const SERVER_KEY = 'AIzaSyDSzrKrLTMkbo2Zy4BE49XRfHETfyxChqQ';

export function resolveServerPlacesApiKey() {
  return (
    String(process.env.GOOGLE_PLACES_SERVER_KEY ?? '').trim() ||
    String(process.env.PLACES_API_SERVER_KEY ?? '').trim() ||
    SERVER_KEY
  );
}

export function buildSearchQuery(row) {
  const parts = [row.name, row.address, 'Athens', 'Greece'].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function normalizeSearchQuery(q) {
  return String(q ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyError(status, json) {
  const msg = String(json?.error?.message ?? json?.error?.status ?? '').toUpperCase();
  if (status === 429) return 'OVER_QUERY_LIMIT';
  if (status === 403) return 'REQUEST_DENIED';
  if (status === 400) return 'INVALID_REQUEST';
  if (msg.includes('ZERO_RESULTS')) return 'ZERO_RESULTS';
  if (msg.includes('OVER_QUERY')) return 'OVER_QUERY_LIMIT';
  if (msg.includes('REQUEST_DENIED') || msg.includes('REFERRER')) return 'REQUEST_DENIED';
  if (msg.includes('INVALID')) return 'INVALID_REQUEST';
  return status >= 400 ? `HTTP_${status}` : 'OK';
}

export function createLookupStats() {
  return {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    zeroResults: 0,
    byStatus: {},
  };
}

export function recordLookup(stats, log, entry) {
  stats.attempted += 1;
  const bucket = entry.status ?? 'UNKNOWN';
  stats.byStatus[bucket] = (stats.byStatus[bucket] ?? 0) + 1;
  if (entry.ok) stats.succeeded += 1;
  else {
    stats.failed += 1;
    if (bucket === 'ZERO_RESULTS') stats.zeroResults += 1;
  }
  if (log) log.push(entry);
}

export async function searchPlaceByText(apiKey, textQuery) {
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
  const status = classifyError(resp.status, json);
  const places = Array.isArray(json?.places) ? json.places : [];
  return {
    ok: resp.ok && places.length > 0,
    httpStatus: resp.status,
    status,
    error: resp.ok ? null : (json?.error?.message ?? `HTTP ${resp.status}`),
    places,
    raw: json,
  };
}

export async function getPlaceDetails(apiKey, placeId) {
  const id = String(placeId ?? '').trim().replace(/^places\//i, '');
  const resp = await fetch(`${PLACES_NEW_BASE}/${encodeURIComponent(id)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': GET_MASK },
  });
  const json = await resp.json().catch(() => ({}));
  const status = classifyError(resp.status, json);
  return {
    ok: resp.ok,
    httpStatus: resp.status,
    status,
    error: resp.ok ? null : (json?.error?.message ?? `HTTP ${resp.status}`),
    place: resp.ok ? json : null,
    photoCount: Array.isArray(json?.photos) ? json.photos.length : 0,
  };
}

/**
 * Resolve place_id for a venue row via stored id or text search.
 */
export async function resolvePlaceIdForVenue(row, apiKey, stats = null, log = null) {
  const venueName = row.name ?? row.venueName ?? '—';
  const ownPlaceId = String(row.google_place_id ?? '').trim();

  if (ownPlaceId) {
    const det = await getPlaceDetails(apiKey, ownPlaceId);
    const entry = {
      venue: venueName,
      method: 'place_details',
      searchQuery: null,
      normalizedQuery: null,
      httpStatus: det.httpStatus,
      status: det.status,
      ok: det.ok,
      placeId: ownPlaceId,
      candidateCount: det.photoCount,
      googleName: det.place?.displayName?.text ?? null,
      error: det.error,
    };
    if (stats) recordLookup(stats, log, entry);
    if (det.ok) {
      return {
        placeId: ownPlaceId,
        place: det.place,
        lookupMethod: 'stored_place_id',
        searchQuery: null,
        log: entry,
      };
    }
  }

  const searchQuery = buildSearchQuery(row);
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const sr = await searchPlaceByText(apiKey, normalizedQuery);
  const top = sr.places?.[0];
  let placeId = top?.id ?? null;
  let photoCount = Array.isArray(top?.photos) ? top.photos.length : 0;
  let place = top;

  if (placeId && photoCount === 0) {
    const det = await getPlaceDetails(apiKey, placeId);
    if (det.ok) {
      place = det.place;
      photoCount = det.photoCount;
    }
  }

  const entry = {
    venue: venueName,
    method: 'text_search',
    searchQuery,
    normalizedQuery,
    httpStatus: sr.httpStatus,
    status: placeId ? 'OK' : sr.status,
    ok: Boolean(placeId),
    placeId,
    candidateCount: photoCount,
    googleName: place?.displayName?.text ?? top?.displayName?.text ?? null,
    googleAddress: place?.formattedAddress ?? top?.formattedAddress ?? null,
    error: placeId ? null : sr.error,
  };
  if (stats) recordLookup(stats, log, entry);

  if (!placeId) {
    return { placeId: null, place: null, lookupMethod: 'text_search_failed', searchQuery, log: entry };
  }

  return {
    placeId,
    place,
    lookupMethod: 'text_search',
    searchQuery,
    log: entry,
  };
}

export function encodeSegments(name) {
  return String(name ?? '')
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
}

export function buildMediaUrl(apiKey, photoResourceName, w = 1200, h = 900) {
  const enc = encodeSegments(String(photoResourceName ?? '').trim());
  if (!enc) return null;
  return `https://places.googleapis.com/v1/${enc}/media?maxWidthPx=${w}&maxHeightPx=${h}&key=${encodeURIComponent(apiKey)}`;
}

export function photoIdFromUrl(url) {
  const m = String(url ?? '').match(/\/photos\/([^/]+)\//);
  return m?.[1] ?? null;
}

export function candidatesFromPlace(apiKey, place, topN = 5) {
  const photos = Array.isArray(place?.photos) ? place.photos : [];
  const out = [];
  for (let i = 0; i < Math.min(topN, photos.length); i++) {
    const url = buildMediaUrl(apiKey, photos[i]?.name);
    if (!url) continue;
    out.push({
      index: out.length,
      label: `Google photo ${out.length + 1}`,
      photoId: photoIdFromUrl(url),
      previewUrl: url,
    });
  }
  return out;
}
