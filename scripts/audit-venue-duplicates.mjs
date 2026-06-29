/**
 * Detect duplicate Athens venues + Google lookup conflicts (read-only).
 * Uses shared resolver for before/after consistency report.
 *   node scripts/audit-venue-duplicates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  buildVenueGoogleResolution,
  googlePhotoCount,
  lookupLabel,
  lookupLabelHuman,
  normalizeAddress,
  normalizeVenueName,
  resolvedLookupLabel,
} from './lib/venueGoogleResolver.mjs';

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

const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await sb
  .from('event')
  .select('id,name,address,genre,google_place_id,image_url,image_gallery,location_lat,location_lng')
  .eq('city', 'Athens')
  .order('name');
if (error) throw error;

const rows = (data ?? []).map((r, i) => ({ ...r, _idx: i + 1 }));
const { resolutionByEventId, clusters } = buildVenueGoogleResolution(rows);

const multiClusters = clusters.filter((c) => c.size > 1);

function preConflict(members) {
  const statuses = new Set(members.map((m) => lookupLabel(m)));
  const pids = new Set(members.map((m) => String(m.google_place_id ?? '').trim()).filter(Boolean));
  return statuses.size > 1 || pids.size > 1;
}

function postConflict(members) {
  const resolved = members.map((m) => resolutionByEventId.get(m.id)?.resolvedPlaceId ?? null);
  const unique = new Set(resolved.filter(Boolean));
  const labels = members.map((m) => resolvedLookupLabel(resolutionByEventId.get(m.id)));
  return unique.size > 1 || new Set(labels).size > 1;
}

let preConflicts = 0;
let postConflicts = 0;
let resolvedByInheritance = 0;

const clusterReports = multiClusters.map((c) => {
  const members = c.members.map((m) => {
    const row = rows.find((r) => r.id === m.id);
    const res = resolutionByEventId.get(m.id);
    return {
      listIndex: row?._idx,
      id: m.id,
      name: m.name,
      address: row?.address ?? null,
      normName: normalizeVenueName(m.name),
      normAddress: normalizeAddress(row?.address),
      googlePlaceId: m.googlePlaceId,
      preLookup: lookupLabelHuman(m.lookup),
      postPlaceId: res?.resolvedPlaceId ?? null,
      postLookup: lookupLabelHuman(resolvedLookupLabel(res)),
      resolutionSource: res?.source ?? 'self',
      inheritedFrom: res?.inheritedFrom ?? null,
      googlePhotoCount: googlePhotoCount(row ?? {}),
    };
  });

  const wasConflict = preConflict(c.members.map((m) => rows.find((r) => r.id === m.id)));
  const stillConflict = postConflict(c.members);
  if (wasConflict) preConflicts++;
  if (stillConflict) postConflicts++;
  if (members.some((m) => m.resolutionSource === 'sibling' || m.resolutionSource === 'cluster_canonical')) {
    resolvedByInheritance++;
  }

  let reason = '';
  let fix = '';
  if (wasConflict) {
    const withPid = members.filter((m) => m.googlePlaceId);
    const without = members.filter((m) => !m.googlePlaceId);
    if (withPid.length && without.length) {
      reason = `${withPid.length} row(s) have google_place_id; ${without.length} missing it (same duplicate cluster)`;
      fix = `Resolver inherits place_id from sibling — no manual fix needed for review UI.`;
    } else if (new Set(withPid.map((m) => m.googlePlaceId)).size > 1) {
      reason = `Conflicting place_ids: ${[...new Set(withPid.map((m) => m.googlePlaceId))].join(' vs ')}`;
      fix = `Canonical place_id chosen by majority + gallery quality. Flag for manual DB cleanup if wrong.`;
    } else {
      reason = 'Mixed pre-resolution lookup status within cluster';
      fix = 'Resolver unifies place_id for review.';
    }
  }

  return {
    clusterKey: c.clusterKey,
    canonicalName: c.canonicalName,
    count: c.size,
    preConflict: wasConflict,
    postConflict: stillConflict,
    resolvedPlaceId: c.resolvedPlaceId,
    placeIdConflict: c.placeIdConflict,
    conflictingPlaceIds: c.conflictingPlaceIds,
    reason,
    fix,
    members,
  };
});

clusterReports.sort((a, b) => (b.preConflict - a.preConflict) || (b.count - a.count));

const uniqueNormNames = new Set(rows.map((r) => normalizeVenueName(r.name)).filter(Boolean)).size;
const inheritedRows = [...resolutionByEventId.values()].filter(
  (r) => r.source === 'sibling' || r.source === 'cluster_canonical',
).length;

const report = {
  generatedAt: new Date().toISOString(),
  totalVenues: rows.length,
  uniqueByNormalizedName: uniqueNormNames,
  duplicateClusters: multiClusters.length,
  duplicateRecords: rows.length - uniqueNormNames,
  preResolutionConflicts: preConflicts,
  postResolutionConflicts: postConflicts,
  resolvedDuplicates: multiClusters.filter((c) => !postConflict(c.members)).length,
  conflictingDuplicates: postConflicts,
  inheritedPlaceIdRows: inheritedRows,
  clusters: clusterReports,
};

const outJson = path.join(ROOT, 'artifacts/venue-duplicate-audit.json');
const outMd = path.join(ROOT, 'artifacts/venue-duplicate-audit.md');
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

let md = `# Athens venue duplicate audit\n\n`;
md += `Normalization: NFKD, strip accents, lowercase, collapse punctuation/spaces, apostrophe variants.\n\n`;
md += `| Metric | Count |\n|--------|------:|\n`;
md += `| Total venues | ${report.totalVenues} |\n`;
md += `| Unique (normalized name) | ${report.uniqueByNormalizedName} |\n`;
md += `| Duplicate clusters | ${report.duplicateClusters} |\n`;
md += `| Pre-resolution conflicts | ${report.preResolutionConflicts} |\n`;
md += `| **Post-resolution conflicts** | **${report.postResolutionConflicts}** |\n`;
md += `| Rows inheriting sibling place_id | ${report.inheritedPlaceIdRows} |\n\n`;

const preOnly = clusterReports.filter((c) => c.preConflict);
md += `## Pre-resolution conflicts (${preOnly.length})\n\n`;
for (const c of preOnly) {
  md += `### ${c.canonicalName} (${c.count} records)${c.postConflict ? ' — still conflicting after resolver' : ' — ✓ unified'}\n\n`;
  md += `| # | Name | Place ID (raw) | Pre | Post place_id | Post | Source |\n`;
  md += `|---|------|----------------|-----|---------------|------|--------|\n`;
  for (const m of c.members) {
    md += `| ${m.listIndex} | ${m.name} | \`${m.googlePlaceId ?? '—'}\` | ${m.preLookup} | \`${m.postPlaceId ?? '—'}\` | ${m.postLookup} | ${m.resolutionSource}${m.inheritedFrom ? ` ← ${m.inheritedFrom}` : ''} |\n`;
  }
  md += `\n**Reason:** ${c.reason}\n\n**Fix:** ${c.fix}\n\n`;
}

if (postConflicts > 0) {
  md += `## Remaining post-resolution conflicts\n\n`;
  for (const c of clusterReports.filter((x) => x.postConflict)) {
    md += `- **${c.canonicalName}** — place_ids: ${c.conflictingPlaceIds.join(', ') || 'mixed lookup'}\n`;
  }
  md += `\n`;
}

fs.writeFileSync(outMd, md);
console.log('Wrote', outJson);
console.log('Wrote', outMd);
console.log(
  `Total: ${report.totalVenues} | Clusters: ${report.duplicateClusters} | Pre conflicts: ${preConflicts} | Post conflicts: ${postConflicts} | Inherited: ${inheritedRows}`,
);
