/**
 * Full pipeline diagnostics — duplicates, resolver, live Places API (read-only).
 *   node scripts/diagnostics-venue-places-pipeline.mjs
 *   LIMIT=15 node scripts/diagnostics-venue-places-pipeline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  buildVenueGoogleResolution,
  googlePhotoCount,
  lookupLabelHuman,
  normalizeVenueName,
  addressStem,
} from './lib/venueGoogleResolver.mjs';
import {
  createLookupStats,
  resolvePlaceIdForVenue,
  resolveServerPlacesApiKey,
  buildSearchQuery,
} from './lib/placesLookup.mjs';

function loadEnvFile(envPath, override = false) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (override || !process.env[k]) process.env[k] = v;
  }
}

const ROOT = process.cwd();
for (const f of ['.env', '.env.local']) loadEnvFile(path.join(ROOT, f));
loadEnvFile(path.join(ROOT, '.env.development.local'), true);

const apiKey = resolveServerPlacesApiKey();
const keyPreview = apiKey ? `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}` : 'MISSING';
const limit = Number(process.env.LIMIT ?? 0) || Infinity;

const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: rows, error } = await sb
  .from('event')
  .select('id,name,address,genre,google_place_id,image_url,image_gallery,location_lat,location_lng')
  .eq('city', 'Athens')
  .order('name');
if (error) throw error;

const { resolutionByEventId, clusters } = buildVenueGoogleResolution(rows ?? []);
const multiClusters = clusters.filter((c) => c.size > 1);

// Duplicate groups where one member has Google data and another is empty
const duplicateFixes = [];
for (const c of multiClusters) {
  const members = c.members.map((m) => {
    const row = rows.find((r) => r.id === m.id);
    const res = resolutionByEventId.get(m.id);
    return {
      id: m.id,
      name: m.name,
      address: row?.address ?? null,
      ownPlaceId: m.googlePlaceId,
      resolvedPlaceId: res?.resolvedPlaceId ?? null,
      googlePhotos: googlePhotoCount(row ?? {}),
      hasHero: Boolean(String(row?.image_url ?? '').trim()),
      lookup: lookupLabelHuman(m.lookup),
      resolutionSource: res?.source ?? 'self',
      inheritedFrom: res?.inheritedFrom ?? null,
    };
  });
  const withData = members.filter((m) => m.resolvedPlaceId || m.googlePhotos > 0 || m.hasHero);
  const empty = members.filter((m) => !m.resolvedPlaceId && m.googlePhotos === 0 && !m.hasHero);
  if (withData.length && empty.length) {
    duplicateFixes.push({
      clusterKey: c.clusterKey,
      canonical: c.canonicalName,
      resolvedPlaceId: c.resolvedPlaceId,
      withData,
      empty,
      proposedFix: `Inherit place_id ${c.resolvedPlaceId ?? withData[0].ownPlaceId} from ${withData[0].name} → ${empty.map((e) => e.name).join(', ')}`,
    });
  }
}

const unresolvedAfterResolver = (rows ?? []).filter((r) => !resolutionByEventId.get(r.id)?.resolvedPlaceId);
const toLookup = unresolvedAfterResolver.slice(0, limit === Infinity ? undefined : limit);

const stats = createLookupStats();
const lookupLogs = [];
const liveResults = [];

console.log(`\n=== API KEY ===\nLoaded: ${keyPreview}\n`);

for (const row of toLookup) {
  const result = await resolvePlaceIdForVenue(row, apiKey, stats, lookupLogs);
  liveResults.push({
    eventId: row.id,
    venueName: row.name,
    address: row.address,
    searchQuery: result.searchQuery ?? buildSearchQuery(row),
    resolvedPlaceId: result.placeId,
    candidateCount: Array.isArray(result.place?.photos) ? result.place.photos.length : 0,
    lookupMethod: result.lookupMethod,
    googleName: result.place?.displayName?.text ?? null,
    log: result.log,
  });
  await new Promise((r) => setTimeout(r, 120));
}

const failed = liveResults.filter((r) => !r.resolvedPlaceId);
const succeeded = liveResults.filter((r) => r.resolvedPlaceId);

const report = {
  generatedAt: new Date().toISOString(),
  apiKeyLoaded: Boolean(apiKey),
  apiKeyPreview: keyPreview,
  totalVenues: rows.length,
  duplicateClusters: multiClusters.length,
  duplicateEmptyVsFilled: duplicateFixes.length,
  unresolvedAfterResolver: unresolvedAfterResolver.length,
  liveLookupAttempted: toLookup.length,
  liveLookupStats: stats,
  duplicateFixProposals: duplicateFixes,
  liveSucceeded: succeeded,
  liveFailed: failed.map((r) => ({
    venueName: r.venueName,
    eventId: r.eventId,
    address: r.address,
    searchQuery: r.searchQuery,
    status: r.log?.status,
    httpStatus: r.log?.httpStatus,
    error: r.log?.error,
    reason: r.log?.error ?? r.log?.status ?? 'unknown',
    suggestedFix: r.log?.status === 'ZERO_RESULTS'
      ? 'Refine search query or verify business name/address in catalog'
      : r.log?.status === 'REQUEST_DENIED'
        ? 'Check API key, billing, Places API (New) enabled'
        : 'Check query + API response in lookupLogs',
  })),
  lookupLogs,
};

const outJson = path.join(ROOT, 'artifacts/venue-places-pipeline-diagnostics.json');
const outMd = path.join(ROOT, 'artifacts/venue-places-pipeline-diagnostics.md');
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

let md = `# Venue Places pipeline diagnostics\n\n`;
md += `Generated: ${report.generatedAt}\n\n`;
md += `## API key\n\n- Loaded: **${report.apiKeyLoaded}** (\`${keyPreview}\`)\n`;
md += `- Uses server-side key (no referrer restriction)\n\n`;
md += `## Summary\n\n`;
md += `| Metric | Count |\n|--------|------:|\n`;
md += `| Total venues | ${report.totalVenues} |\n`;
md += `| Duplicate clusters | ${report.duplicateClusters} |\n`;
md += `| Empty duplicate w/ filled sibling | ${report.duplicateEmptyVsFilled} |\n`;
md += `| Unresolved after duplicate resolver | ${report.unresolvedAfterResolver} |\n`;
md += `| Live Places lookups attempted | ${report.liveLookupAttempted} |\n`;
md += `| Live succeeded | ${succeeded.length} |\n`;
md += `| Live failed | ${failed.length} |\n\n`;
md += `## Google API stats\n\n`;
md += `- Attempted: ${stats.attempted}\n`;
md += `- Succeeded: ${stats.succeeded}\n`;
md += `- Failed: ${stats.failed}\n`;
md += `- ZERO_RESULTS: ${stats.zeroResults}\n`;
md += `- By status: ${JSON.stringify(stats.byStatus)}\n\n`;

md += `## Duplicate groups — empty row + filled sibling (${duplicateFixes.length})\n\n`;
for (const g of duplicateFixes) {
  md += `### ${g.canonical} (\`${g.clusterKey}\`)\n\n`;
  md += `**Proposed fix:** ${g.proposedFix}\n\n`;
  md += `| Row | Place ID | Photos | Status |\n|-----|----------|--------|--------|\n`;
  for (const m of [...g.withData, ...g.empty]) {
    md += `| ${m.name} | \`${m.resolvedPlaceId ?? m.ownPlaceId ?? '—'}\` | ${m.googlePhotos} | ${m.lookup}${m.inheritedFrom ? ` ← ${m.inheritedFrom}` : ''} |\n`;
  }
  md += `\n`;
}

md += `## Live lookup failures (${failed.length})\n\n`;
if (!failed.length) md += `_None in this run._\n\n`;
for (const f of report.liveFailed) {
  md += `### ${f.venueName}\n\n`;
  md += `- Search: \`${f.searchQuery}\`\n`;
  md += `- Status: ${f.status} (HTTP ${f.httpStatus})\n`;
  md += `- Reason: ${f.reason}\n`;
  md += `- Fix: ${f.suggestedFix}\n\n`;
}

md += `## Live lookup successes (sample)\n\n`;
for (const s of succeeded.slice(0, 20)) {
  md += `- **${s.venueName}** → \`${s.resolvedPlaceId}\` (${s.candidateCount} photos) via ${s.lookupMethod}\n`;
}
if (succeeded.length > 20) md += `\n_…and ${succeeded.length - 20} more_\n`;

fs.writeFileSync(outMd, md);
console.log('Wrote', outJson);
console.log('Wrote', outMd);
console.log(`Resolver unresolved: ${unresolvedAfterResolver.length} | Live OK: ${succeeded.length} | Live fail: ${failed.length}`);
console.log('API stats:', JSON.stringify(stats.byStatus));
