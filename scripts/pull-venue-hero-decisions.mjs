/**
 * Pull review decisions from browser localStorage (review UI origin).
 * Writes artifacts/venue-hero-review/venue-hero-approvals-raw.json
 *
 *   node scripts/pull-venue-hero-decisions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const STORAGE_KEY = 'bandits-venue-hero-review-v1';
const REVIEW_ORIGIN = process.env.REVIEW_ORIGIN ?? 'http://127.0.0.1:3456';
const OUT = path.join(process.cwd(), 'artifacts/venue-hero-review/venue-hero-approvals-raw.json');

const CHROME_PROFILES = [
  path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'User Data'),
  path.join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Edge', 'User Data'),
];

async function readFromFreshContext() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(REVIEW_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } finally {
    await browser.close();
  }
}

async function readFromPersistentProfile(userDataDir) {
  if (!userDataDir || !fs.existsSync(userDataDir)) return null;
  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chrome',
      headless: true,
      args: ['--profile-directory=Default'],
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(REVIEW_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`Profile read failed (${userDataDir}):`, e.message);
    return null;
  } finally {
    if (context) await context.close();
  }
}

let decisions = null;
for (const profile of CHROME_PROFILES) {
  decisions = await readFromPersistentProfile(profile);
  if (decisions && Object.keys(decisions).length) {
    console.log(`Found ${Object.keys(decisions).length} decisions in ${profile}`);
    break;
  }
}
if (!decisions || !Object.keys(decisions).length) {
  decisions = await readFromFreshContext();
  if (decisions && Object.keys(decisions).length) {
    console.log(`Found ${Object.keys(decisions).length} decisions in fresh context`);
  }
}

if (!decisions || !Object.keys(decisions).length) {
  console.error('No review decisions in browser localStorage.');
  console.error('Open http://127.0.0.1:3456 and click Export approvals JSON, or re-save any decision to sync.');
  process.exit(1);
}

const counts = { keep_current: 0, use_candidate: 0, skip: 0, pending: 0, other: 0 };
for (const d of Object.values(decisions)) {
  const s = d?.status ?? 'other';
  counts[s] = (counts[s] ?? 0) + 1;
}

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      pulledAt: new Date().toISOString(),
      source: 'browser-localStorage',
      decisionCounts: counts,
      decisions,
    },
    null,
    2,
  ),
);

console.log('Wrote', OUT);
console.log('Counts:', counts);
