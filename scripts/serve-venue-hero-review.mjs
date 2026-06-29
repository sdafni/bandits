/**
 * Local review server — serves UI + proxies images (fresh Google Places photos).
 * No database writes.
 *
 *   node scripts/serve-venue-hero-review.mjs
 *   REVIEW_PORT=3456 node scripts/serve-venue-hero-review.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildVenueGoogleResolution } from './lib/venueGoogleResolver.mjs';
import { resolvePlaceIdForVenue } from './lib/placesLookup.mjs';

const ROOT = path.join(process.cwd(), 'artifacts/venue-hero-review');
const CACHE_DIR = path.join(ROOT, '.cache');
const APPROVALS_PATH = path.join(ROOT, 'venue-hero-approvals.json');
const PORT = Number(process.env.REVIEW_PORT ?? 3456);
const PLACE_TTL_MS = 60 * 60 * 1000;
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

/** Server-side Places key (backfill scripts). Client app.json key is HTTP-referrer restricted. */
const SERVER_PLACES_KEY = 'AIzaSyDSzrKrLTMkbo2Zy4BE49XRfHETfyxChqQ';

function resolveApiKey() {
  loadEnvFile(path.join(process.cwd(), '.env'));
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env.development.local'), true);
  return (
    String(process.env.GOOGLE_PLACES_SERVER_KEY ?? '').trim() ||
    String(process.env.PLACES_API_SERVER_KEY ?? '').trim() ||
    SERVER_PLACES_KEY
  );
}

const API_KEY = resolveApiKey();
const placeCache = new Map();
/** @type {Map<string, { resolvedPlaceId: string|null, source: string, inheritedFrom: string|null }>} */
let venueResolutionByEventId = new Map();
/** @type {Map<string, object>} */
const rowByEventId = new Map();
const runtimeLookupCache = new Map();

async function loadVenueResolutionFromDb() {
  loadEnvFile(path.join(process.cwd(), '.env'));
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env.development.local'), true);
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('No Supabase credentials — duplicate place_id resolution disabled');
    return;
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from('event')
    .select('id,name,address,google_place_id,image_url,image_gallery,location_lat,location_lng')
    .eq('city', 'Athens');
  if (error) {
    console.warn('Failed to load venues for resolution:', error.message);
    return;
  }
  for (const row of data ?? []) rowByEventId.set(row.id, row);
  const { resolutionByEventId } = buildVenueGoogleResolution(data ?? []);
  venueResolutionByEventId = resolutionByEventId;

  const cachePath = path.join(ROOT, 'places-lookup-cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      const disk = JSON.parse(fs.readFileSync(cachePath, 'utf8')).byEventId ?? {};
      let merged = 0;
      for (const [eventId, entry] of Object.entries(disk)) {
        if (!entry?.placeId || !venueResolutionByEventId.has(eventId)) continue;
        const r = venueResolutionByEventId.get(eventId);
        if (!r.resolvedPlaceId) {
          venueResolutionByEventId.set(eventId, {
            ...r,
            resolvedPlaceId: entry.placeId,
            source: 'places_api_search_cached',
            liveSearchQuery: entry.searchQuery ?? null,
          });
          merged++;
        }
      }
      if (merged) console.log(`Merged ${merged} place_ids from places-lookup-cache.json`);
    } catch (e) {
      console.warn('Could not load places-lookup-cache.json:', e.message);
    }
  }

  const inherited = [...resolutionByEventId.values()].filter(
    (r) => r.source === 'sibling' || r.source === 'cluster_canonical',
  ).length;
  const resolved = [...venueResolutionByEventId.values()].filter((r) => r.resolvedPlaceId).length;
  console.log(`Loaded ${venueResolutionByEventId.size} venues (${inherited} sibling inherit, ${resolved} with place_id)`);
}

function resolvePlaceIdSync(placeIdParam, eventIdParam) {
  const eventId = String(eventIdParam ?? '').trim();
  if (eventId && venueResolutionByEventId.has(eventId)) {
    const r = venueResolutionByEventId.get(eventId);
    if (r.resolvedPlaceId) return r.resolvedPlaceId;
  }
  if (eventId && runtimeLookupCache.has(eventId)) return runtimeLookupCache.get(eventId);
  return normalizePlaceId(placeIdParam);
}

async function resolvePlaceIdAsync(placeIdParam, eventIdParam) {
  const sync = resolvePlaceIdSync(placeIdParam, eventIdParam);
  if (sync) return sync;
  const eventId = String(eventIdParam ?? '').trim();
  if (!eventId || runtimeLookupCache.has(eventId)) return runtimeLookupCache.get(eventId) ?? null;
  const row = rowByEventId.get(eventId);
  if (!row) return null;
  console.log(`[places] live lookup: ${row.name}`);
  const result = await resolvePlaceIdForVenue(row, API_KEY);
  if (result.placeId) {
    runtimeLookupCache.set(eventId, result.placeId);
    const prev = venueResolutionByEventId.get(eventId) ?? { eventId, venueName: row.name };
    venueResolutionByEventId.set(eventId, {
      ...prev,
      resolvedPlaceId: result.placeId,
      source: 'places_api_search_runtime',
      liveSearchQuery: result.searchQuery ?? null,
    });
    return result.placeId;
  }
  runtimeLookupCache.set(eventId, null);
  return null;
}

function encodeSegments(name) {
  return String(name ?? '')
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function buildMediaUrl(resourceName, w = 1200, h = 900) {
  const enc = encodeSegments(String(resourceName ?? '').trim());
  if (!enc) return null;
  return `https://places.googleapis.com/v1/${enc}/media?maxWidthPx=${w}&maxHeightPx=${h}&key=${encodeURIComponent(API_KEY)}`;
}

function normalizePlaceId(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^places\//i, '');
}

function cacheFileKey(kind, id) {
  const safe = String(id).replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(CACHE_DIR, kind, safe);
}

function readDiskCache(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    if (Date.now() - stat.mtimeMs > PLACE_TTL_MS) return null;
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function writeDiskCache(filePath, buf) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buf);
  } catch {
    /* ignore */
  }
}

async function fetchPlacePhotos(placeIdBare) {
  const id = normalizePlaceId(placeIdBare);
  if (!id) return { photos: [], error: 'missing placeId' };

  const cached = placeCache.get(id);
  if (cached && Date.now() - cached.at < PLACE_TTL_MS) return cached.data;

  const diskPath = cacheFileKey('places', `${id}.json`);
  try {
    if (fs.existsSync(diskPath)) {
      const stat = fs.statSync(diskPath);
      if (Date.now() - stat.mtimeMs < PLACE_TTL_MS) {
        const data = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
        placeCache.set(id, { at: Date.now(), data });
        return data;
      }
    }
  } catch {
    /* refetch */
  }

  const resp = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,photos',
    },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const data = { photos: [], error: json?.error?.message ?? `HTTP ${resp.status}` };
    placeCache.set(id, { at: Date.now(), data });
    return data;
  }

  const photos = Array.isArray(json?.photos) ? json.photos : [];
  const data = {
    photos: photos.slice(0, TOP_N).map((p, index) => ({
      index,
      resourceName: String(p?.name ?? '').trim(),
    })),
    displayName: json?.displayName?.text ?? null,
    formattedAddress: json?.formattedAddress ?? null,
    error: null,
  };
  placeCache.set(id, { at: Date.now(), data });
  try {
    fs.mkdirSync(path.dirname(diskPath), { recursive: true });
    fs.writeFileSync(diskPath, JSON.stringify(data));
  } catch {
    /* ignore */
  }
  return data;
}

async function streamPhoto(placeId, index, w, h) {
  const place = await fetchPlacePhotos(placeId);
  const photo = place.photos?.[Number(index)];
  if (!photo?.resourceName) {
    return { status: 404, body: `No photo at index ${index}${place.error ? `: ${place.error}` : ''}` };
  }

  const mediaUrl = buildMediaUrl(photo.resourceName, w, h);
  const cachePath = cacheFileKey('photos', `${normalizePlaceId(placeId)}_${index}_${w}.jpg`);
  const cached = readDiskCache(cachePath);
  if (cached) {
    return { status: 200, body: cached, contentType: 'image/jpeg', cacheControl: 'public, max-age=3600' };
  }

  const resp = await fetch(mediaUrl, { redirect: 'follow' });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { status: resp.status, body: text || 'Photo fetch failed' };
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  writeDiskCache(cachePath, buf);
  return { status: 200, body: buf, contentType, cacheControl: 'public, max-age=3600' };
}

async function resolvePhotoJson(placeId, index) {
  const place = await fetchPlacePhotos(placeId);
  const photo = place.photos?.[Number(index)];
  if (!photo?.resourceName) {
    return { status: 404, json: { error: place.error ?? `No photo at index ${index}` } };
  }
  return {
    status: 200,
    json: {
      placeId: normalizePlaceId(placeId),
      index: Number(index),
      photoResourceName: photo.resourceName,
      mediaUrl: buildMediaUrl(photo.resourceName, 1600, 1200),
      thumbUrl: buildMediaUrl(photo.resourceName, 480, 360),
    },
  };
}

const ALLOWED_PROXY_HOSTS = [
  'places.googleapis.com',
  'maps.googleapis.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  'images.pexels.com',
  'images.unsplash.com',
  'zubcakeamyfqatdmleqx.supabase.co',
];

function isAllowedProxyUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_PROXY_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

async function proxyUrl(raw, w) {
  if (!isAllowedProxyUrl(raw)) return { status: 400, body: 'URL not allowed' };

  let target = raw;
  if (raw.includes('places.googleapis.com')) {
    const u = new URL(raw);
    u.searchParams.set('maxWidthPx', String(w || u.searchParams.get('maxWidthPx') || 480));
    u.searchParams.set('maxHeightPx', String(Math.round(Number(u.searchParams.get('maxWidthPx')) * 0.75)));
    u.searchParams.set('key', API_KEY);
    target = u.toString();
  } else if (w) {
    /* non-Google URLs ignore w */
  }

  const cacheKey = Buffer.from(target).toString('base64url').slice(0, 120);
  const cachePath = cacheFileKey('proxy', `${cacheKey}.bin`);
  const cached = readDiskCache(cachePath);
  if (cached) {
    return { status: 200, body: cached, contentType: 'image/jpeg', cacheControl: 'public, max-age=3600' };
  }

  const resp = await fetch(target, { redirect: 'follow' });
  if (!resp.ok) {
    return { status: resp.status, body: await resp.text().catch(() => 'Proxy fetch failed') };
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  if (contentType.startsWith('image/')) writeDiskCache(cachePath, buf);
  return { status: resp.status, body: buf, contentType, cacheControl: 'public, max-age=600' };
}

function sendJson(res, status, json) {
  const body = JSON.stringify(json);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendBody(res, status, result) {
  const headers = { 'Cache-Control': result.cacheControl ?? 'no-store' };
  if (result.contentType) headers['Content-Type'] = result.contentType;
  res.writeHead(status, headers);
  res.end(result.body);
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function serveStatic(req, res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': contentTypeFor(filePath), 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(res);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function saveApprovalsExport(json) {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(APPROVALS_PATH, JSON.stringify(json, null, 2));
  return APPROVALS_PATH;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
    const pathname = url.pathname;

    if (pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        port: PORT,
        venueResolutionLoaded: venueResolutionByEventId.size,
      });
      return;
    }

    if (pathname === '/api/venue-resolution') {
      const eventId = url.searchParams.get('eventId');
      if (!eventId) {
        sendJson(res, 400, { error: 'Missing eventId' });
        return;
      }
      const r = venueResolutionByEventId.get(eventId);
      sendJson(res, r ? 200 : 404, r ?? { error: 'Unknown eventId' });
      return;
    }

    if (pathname === '/api/photos') {
      const placeId = await resolvePlaceIdAsync(
        url.searchParams.get('placeId'),
        url.searchParams.get('eventId'),
      );
      const data = await fetchPlacePhotos(placeId);
      sendJson(res, 200, data);
      return;
    }

    if (pathname === '/api/resolve') {
      const placeId = await resolvePlaceIdAsync(
        url.searchParams.get('placeId'),
        url.searchParams.get('eventId'),
      );
      const index = url.searchParams.get('index') ?? '0';
      const result = await resolvePhotoJson(placeId, index);
      sendJson(res, result.status, result.json);
      return;
    }

    if (pathname === '/api/photo') {
      const placeId = await resolvePlaceIdAsync(
        url.searchParams.get('placeId'),
        url.searchParams.get('eventId'),
      );
      const index = url.searchParams.get('index') ?? '0';
      const w = Math.min(2400, Math.max(120, Number(url.searchParams.get('w') ?? 480)));
      const h = Math.min(1800, Math.max(90, Number(url.searchParams.get('h') ?? Math.round(w * 0.75))));
      const result = await streamPhoto(placeId, index, w, h);
      if (result.contentType) sendBody(res, result.status, result);
      else sendBody(res, result.status, { body: result.body, contentType: 'text/plain; charset=utf-8' });
      return;
    }

    if (pathname === '/api/proxy') {
      const target = url.searchParams.get('url');
      if (!target) {
        res.writeHead(400).end('Missing url');
        return;
      }
      const w = url.searchParams.get('w');
      const result = await proxyUrl(target, w ? Number(w) : null);
      if (result.contentType) sendBody(res, result.status, result);
      else sendBody(res, result.status, { body: result.body, contentType: 'text/plain; charset=utf-8' });
      return;
    }

    if (pathname === '/api/approvals' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const payload = {
        savedAt: new Date().toISOString(),
        exportedAt: body.exportedAt ?? new Date().toISOString(),
        note: body.note ?? 'Synced from review UI',
        decisions: body.decisions ?? [],
      };
      const saved = await saveApprovalsExport(payload);
      sendJson(res, 200, { ok: true, path: saved, count: payload.decisions.length });
      return;
    }

    if (pathname === '/api/approvals' && req.method === 'GET') {
      if (!fs.existsSync(APPROVALS_PATH)) {
        sendJson(res, 404, { error: 'No saved approvals yet' });
        return;
      }
      sendJson(res, 200, JSON.parse(fs.readFileSync(APPROVALS_PATH, 'utf8')));
      return;
    }

    serveStatic(req, res, pathname);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(err?.message ?? err));
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  await loadVenueResolutionFromDb();
  console.log(`Venue hero review: http://127.0.0.1:${PORT}`);
  console.log('Images load via fresh Google Places fetch + duplicate-aware place_id resolution.');
  console.log('No database writes.');
});
