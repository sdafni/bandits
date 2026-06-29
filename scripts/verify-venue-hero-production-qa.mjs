/**
 * Post-apply production QA — random stratified sample + full duplicate scan.
 *   node scripts/verify-venue-hero-production-qa.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const PREPARED = path.join(ROOT, 'artifacts/venue-hero-review/venue-hero-approvals-prepared.json');
const OUT_JSON = path.join(ROOT, 'artifacts/venue-hero-production-qa.json');
const OUT_MD = path.join(ROOT, 'artifacts/venue-hero-production-qa.md');
const SAMPLE_MIN = Number(process.env.QA_SAMPLE_MIN ?? 30);
const MAX_LOAD_MS = Number(process.env.QA_MAX_LOAD_MS ?? 4000);
const MIN_BYTES = 3000;
const MIN_ASPECT = 0.45;
const MAX_ASPECT = 2.4;

const STOCK_HOSTS = ['images.pexels.com', 'pexels.com', 'images.unsplash.com', 'unsplash.com', 'picsum.photos'];
const PLACEHOLDER_PATTERNS = [
  /play_athens_bg/i,
  /data:image\/svg/i,
  /Image pending/i,
  /logobanditour/i,
];

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

function bucketGenre(genre) {
  const g = String(genre ?? '').toLowerCase();
  if (g.includes('food') || g.includes('restaurant') || g.includes('brunch')) return 'Food';
  if (g.includes('coffee') || g.includes('café') || g.includes('cafe')) return 'Coffee';
  if (g.includes('night') || g.includes('bar') || g.includes('club') || g.includes('cocktail')) return 'Bars/Nightlife';
  if (g.includes('culture') || g.includes('museum') || g.includes('gallery') || g.includes('cinema') || g.includes('theatre')) return 'Culture';
  if (g.includes('shop') || g.includes('store') || g.includes('market') || g.includes('boutique')) return 'Shopping';
  if (g.includes('park') || g.includes('garden') || g.includes('beach') || g.includes('view')) return 'Parks/Outdoors';
  return 'Other';
}

function isStockOrPlaceholder(url) {
  const t = String(url ?? '').trim();
  if (!t) return true;
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(t))) return true;
  try {
    const host = new URL(t).hostname.toLowerCase();
    if (STOCK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function photoIdentity(url) {
  try {
    const u = new URL(url);
    if (u.pathname.includes('/photos/')) {
      const m = u.pathname.match(/\/photos\/([^/]+)\/media/i);
      if (m) return `gphoto:${m[1].slice(0, 48)}`;
    }
    if (u.hostname.includes('supabase.co')) return `storage:${u.pathname}`;
    return `url:${u.hostname}${u.pathname}`;
  } catch {
    return `raw:${url}`;
  }
}

function parseJpegDimensions(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return { w, h };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

function parsePngDimensions(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function parseImageDimensions(buf, contentType) {
  const ct = String(contentType ?? '').toLowerCase();
  if (ct.includes('jpeg') || ct.includes('jpg') || buf[0] === 0xff) return parseJpegDimensions(buf);
  if (ct.includes('png') || buf.toString('ascii', 0, 4) === '\x89PNG') return parsePngDimensions(buf);
  return null;
}

async function probeImage(url) {
  const t0 = Date.now();
  const resp = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'bandits-hero-qa/1.0' } });
  const ms = Date.now() - t0;
  const ct = resp.headers.get('content-type') ?? '';
  const buf = Buffer.from(await resp.arrayBuffer());
  const dims = parseImageDimensions(buf, ct);
  const aspect = dims ? dims.w / dims.h : null;
  return {
    ok: resp.ok,
    status: resp.status,
    contentType: ct,
    bytes: buf.byteLength,
    loadMs: ms,
    dims,
    aspect,
  };
}

function stratifiedSample(rows, minTotal) {
  const byBucket = new Map();
  for (const r of rows) {
    const b = bucketGenre(r.genre);
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b).push(r);
  }
  const picked = [];
  const buckets = [...byBucket.keys()].sort();
  const perBucket = Math.max(4, Math.ceil(minTotal / Math.max(buckets.length, 1)));
  for (const b of buckets) {
    const list = byBucket.get(b);
    for (let i = 0; i < Math.min(perBucket, list.length); i++) {
      const idx = Math.floor((i + 0.5) * list.length / perBucket);
      picked.push(list[Math.min(idx, list.length - 1)]);
    }
  }
  const seen = new Set();
  const unique = [];
  for (const r of picked) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }
  while (unique.length < minTotal) {
    const extra = rows.find((r) => !seen.has(r.id));
    if (!extra) break;
    seen.add(extra.id);
    unique.push(extra);
  }
  return unique;
}

const prepared = JSON.parse(fs.readFileSync(PREPARED, 'utf8'));
const approvedIds = new Set(
  (prepared.decisions ?? []).filter((d) => d.status === 'use_candidate').map((d) => d.eventId),
);

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: events, error } = await sb
  .from('event')
  .select('id,name,genre,image_url,google_place_id')
  .eq('city', 'Athens');
if (error) throw error;

const applied = events.filter((e) => approvedIds.has(e.id));
const sample = stratifiedSample(applied, SAMPLE_MIN);

console.log(`Applied heroes in DB: ${applied.length}`);
console.log(`QA sample: ${sample.length} venues across ${new Set(sample.map((s) => bucketGenre(s.genre))).size} categories`);

const duplicateMap = new Map();
for (const e of applied) {
  const id = photoIdentity(e.image_url);
  if (!duplicateMap.has(id)) duplicateMap.set(id, []);
  duplicateMap.get(id).push(e);
}
const duplicateClusters = [...duplicateMap.entries()]
  .filter(([, list]) => list.length > 1)
  .map(([identity, list]) => ({
    identity,
    count: list.length,
    venues: list.map((v) => ({ id: v.id, name: v.name, google_place_id: v.google_place_id })),
    samePlaceId: new Set(list.map((v) => v.google_place_id).filter(Boolean)).size <= 1,
  }));

const unexpectedDupes = duplicateClusters.filter((c) => !c.samePlaceId);

const results = [];
let pass = 0;
let fail = 0;

for (const e of sample) {
  const issues = [];
  const bucket = bucketGenre(e.genre);
  const imageUrl = String(e.image_url ?? '').trim();

  if (!imageUrl) issues.push('missing image_url');
  if (isStockOrPlaceholder(imageUrl)) issues.push('stock or placeholder URL');
  if (imageUrl.includes('127.0.0.1')) issues.push('local-only URL');

  let probe = null;
  if (imageUrl && issues.length === 0) {
    try {
      probe = await probeImage(imageUrl);
      if (!probe.ok) issues.push(`HTTP ${probe.status}`);
      if (!probe.contentType.startsWith('image/')) issues.push(`bad content-type: ${probe.contentType}`);
      if (probe.bytes < MIN_BYTES) issues.push(`too small: ${probe.bytes} bytes`);
      if (probe.loadMs > MAX_LOAD_MS) issues.push(`slow load: ${probe.loadMs}ms`);
      if (!probe.dims) issues.push('could not read image dimensions');
      else if (probe.aspect < MIN_ASPECT || probe.aspect > MAX_ASPECT) {
        issues.push(`aspect ratio ${probe.aspect.toFixed(2)} out of range`);
      }
    } catch (err) {
      issues.push(`fetch error: ${err.message}`);
    }
  }

  const row = {
    eventId: e.id,
    venueName: e.name,
    genre: e.genre,
    bucket,
    imageUrl: imageUrl.slice(0, 120) + (imageUrl.length > 120 ? '…' : ''),
    loadMs: probe?.loadMs ?? null,
    bytes: probe?.bytes ?? null,
    dims: probe?.dims ?? null,
    aspect: probe?.aspect ?? null,
    pass: issues.length === 0,
    issues,
  };
  results.push(row);
  if (row.pass) pass++;
  else fail++;
  const mark = row.pass ? '✓' : '✗';
  console.log(`${mark} [${bucket}] ${e.name} — ${issues.length ? issues.join('; ') : `${probe?.loadMs}ms ${probe?.dims?.w}x${probe?.dims?.h}`}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  appliedCount: applied.length,
  sampleSize: sample.length,
  passCount: pass,
  failCount: fail,
  duplicateClusterCount: duplicateClusters.length,
  unexpectedDuplicateClusters: unexpectedDupes.length,
  unexpectedDuplicates: unexpectedDupes,
  results,
  verdict: fail === 0 && unexpectedDupes.length === 0 ? 'PASS' : 'FAIL',
};

fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

let md = `# Venue hero production QA\n\n`;
md += `Generated: ${report.generatedAt}\n\n`;
md += `**Verdict: ${report.verdict}**\n\n`;
md += `- Applied heroes: ${report.appliedCount}\n`;
md += `- Sample checked: ${report.sampleSize} (${pass} pass, ${fail} fail)\n`;
md += `- Duplicate URL clusters: ${report.duplicateClusterCount} (${report.unexpectedDuplicateClusters} unexpected)\n\n`;
if (fail) {
  md += `## Failures\n\n`;
  for (const r of results.filter((x) => !x.pass)) {
    md += `- **${r.venueName}** (${r.bucket}): ${r.issues.join('; ')}\n`;
  }
  md += `\n`;
}
if (unexpectedDupes.length) {
  md += `## Unexpected duplicate heroes\n\n`;
  for (const c of unexpectedDupes) {
    md += `- ${c.count} venues share \`${c.identity}\`: ${c.venues.map((v) => v.name).join(', ')}\n`;
  }
}
fs.writeFileSync(OUT_MD, md);

console.log(`\nVerdict: ${report.verdict}`);
console.log(`Report: ${OUT_MD}`);
process.exit(report.verdict === 'PASS' ? 0 : 1);
