/**
 * Debug image loading for a single venue — exact HTTP responses.
 *   node scripts/debug-venue-photo-load.mjs "The Rabbit Punch"
 */
import fs from 'node:fs';
import path from 'node:path';
import { resolveServerPlacesApiKey, getPlaceDetails } from './lib/placesLookup.mjs';

const venueQuery = process.argv[2] ?? 'The Rabbit Punch';
const pack = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'artifacts/venue-hero-review/review-data.json'), 'utf8'),
);
const venue = pack.venues.find((v) =>
  v.venueName.toLowerCase().includes(venueQuery.toLowerCase()),
);
if (!venue) {
  console.error('Venue not found:', venueQuery);
  process.exit(1);
}

const apiKey = resolveServerPlacesApiKey();
const base = 'http://127.0.0.1:3456';

console.log('\n=== VENUE ===');
console.log(JSON.stringify({
  eventId: venue.eventId,
  name: venue.venueName,
  placeId: venue.googleListing?.placeId,
  resolution: venue.googleListing?.resolution,
  candidateCount: venue.candidates?.length ?? 0,
}, null, 2));

const placeId = venue.googleListing?.placeId;
if (placeId) {
  console.log('\n=== FRESH PLACE DETAILS (direct Google) ===');
  const det = await getPlaceDetails(apiKey, placeId);
  console.log('HTTP', det.httpStatus, 'status', det.status, 'photos', det.photoCount);
  if (det.error) console.log('error:', det.error);
  const photos = det.place?.photos ?? [];
  for (let i = 0; i < Math.min(5, photos.length); i++) {
    const ref = photos[i]?.name ?? '';
    const photoId = ref.split('/photos/')[1]?.split('/')[0] ?? ref;
    console.log(`\n--- Fresh photo ${i} ---`);
    console.log('resourceName:', ref.slice(0, 100) + '…');
    console.log('photoId prefix:', photoId.slice(0, 20));
  }
}

console.log('\n=== STORED CANDIDATE URLs (from review-data.json) ===');
for (const c of venue.candidates ?? []) {
  const pid = c.photoId?.slice(0, 24) ?? '—';
  console.log(`\nCandidate ${c.index}: photoId=${pid}…`);
  const url = c.previewUrl;
  if (!url) {
    console.log('  no previewUrl');
    continue;
  }
  try {
    const r = await fetch(url, { redirect: 'follow' });
    console.log('  DIRECT fetch stored URL:', r.status, r.headers.get('content-type'));
    if (!r.ok) console.log('  body:', (await r.text()).slice(0, 200));
  } catch (e) {
    console.log('  DIRECT fetch error:', e.message);
  }
}

console.log('\n=== PROXY /api/photo (review server) ===');
for (let i = 0; i < 5; i++) {
  const proxyUrl = `${base}/api/photo?eventId=${encodeURIComponent(venue.eventId)}&placeId=${encodeURIComponent(placeId)}&index=${i}&w=480`;
  console.log(`\n--- Proxy index ${i} ---`);
  console.log('URL:', proxyUrl);
  try {
    const r = await fetch(proxyUrl);
    console.log('  status:', r.status);
    console.log('  content-type:', r.headers.get('content-type'));
    console.log('  content-length:', r.headers.get('content-length'));
    console.log('  cache-control:', r.headers.get('cache-control'));
    if (!r.ok) {
      const body = await r.text();
      console.log('  body:', body.slice(0, 300));
    } else {
      const buf = await r.arrayBuffer();
      console.log('  bytes:', buf.byteLength);
    }
  } catch (e) {
    console.log('  fetch error:', e.message);
  }
}

console.log('\n=== /api/resolve ===');
const resolveUrl = `${base}/api/resolve?eventId=${encodeURIComponent(venue.eventId)}&placeId=${encodeURIComponent(placeId)}&index=0`;
const rr = await fetch(resolveUrl);
console.log('status', rr.status);
console.log(await rr.text().then((t) => t.slice(0, 500)));

console.log('\n=== /api/photos list ===');
const listUrl = `${base}/api/photos?eventId=${encodeURIComponent(venue.eventId)}&placeId=${encodeURIComponent(placeId)}`;
const lr = await fetch(listUrl);
const lj = await lr.json();
console.log('status', lr.status, 'photos', lj.photos?.length, 'error', lj.error ?? 'none');
