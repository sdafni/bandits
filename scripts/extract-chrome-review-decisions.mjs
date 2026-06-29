/**
 * Extract per-venue decisions from Chrome LevelDB binary (fallback when export missing).
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.env.TEMP ?? '', 'chrome-ls-read');
const REVIEW_DATA = path.join(process.cwd(), 'artifacts/venue-hero-review/review-data.json');
const OUT = path.join(process.cwd(), 'artifacts/venue-hero-review/venue-hero-approvals-raw.json');

let blob = Buffer.alloc(0);
for (const f of fs.readdirSync(dir)) {
  blob = Buffer.concat([blob, fs.readFileSync(path.join(dir, f))]);
}

const pack = JSON.parse(fs.readFileSync(REVIEW_DATA, 'utf8'));
const text = blob.toString('latin1');

const decisions = {};
for (const v of pack.venues) {
  const id = v.eventId;
  const idx = text.indexOf(`"${id}"`);
  if (idx < 0) continue;
  const slice = text.slice(idx, idx + 4000);
  const statusMatch = slice.match(/"status":"(keep_current|use_candidate|skip)"/);
  if (!statusMatch) continue;
  const d = { status: statusMatch[1] };
  const idxMatch = slice.match(/"candidateIndex":(\d+)/);
  if (idxMatch) d.candidateIndex = Number(idxMatch[1]);
  const urlMatch = slice.match(/"previewUrl":"(https:[^"]+|http:[^"]+)"/);
  if (urlMatch) d.previewUrl = urlMatch[1].replace(/\\u0026/g, '&');
  const atMatch = slice.match(/"decidedAt":"([^"]+)"/);
  if (atMatch) d.decidedAt = atMatch[1];
  decisions[id] = d;
}

const counts = {};
for (const d of Object.values(decisions)) counts[d.status] = (counts[d.status] ?? 0) + 1;

console.log('Extracted', Object.keys(decisions).length, 'decisions', counts);
console.log('Rabbit Punch:', decisions['7d5424bc-38dd-4622-8670-8de0febc4adf']);

if (Object.keys(decisions).length < 300) {
  console.warn('Warning: expected ~318 decisions, got', Object.keys(decisions).length);
}

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      pulledAt: new Date().toISOString(),
      source: 'chrome-leveldb-per-venue-extract',
      decisionCounts: counts,
      decisions,
    },
    null,
    2,
  ),
);
console.log('Wrote', OUT);
