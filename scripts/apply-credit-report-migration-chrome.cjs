/**
 * Apply credit report migrations via Supabase Dashboard using system Chrome profile.
 * Usage: node scripts/apply-credit-report-migration-chrome.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_REF = "wxyywrjblbcpgutyskke";
const CHROME_PROFILE = path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");
const MIGRATIONS = [
  "202606020001_credit_report_consent.sql",
  "202606020002_credit_report_requested.sql",
];

function readEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env.vercel.production", ".env.vercel.pulled"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index === -1) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value && !env[key]) env[key] = value;
    }
  }
  return env;
}

async function verifySchema(env) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const profiles = await admin
    .from("tenant_public_profiles")
    .select("credit_report_consent, credit_report_consent_at, credit_report_requested_at")
    .limit(1);
  return profiles.error ? { ok: false, message: profiles.error.message } : { ok: true };
}

async function main() {
  const env = readEnv();
  const before = await verifySchema(env);
  if (before.ok) {
    console.log(JSON.stringify({ ok: true, via: "already_applied", before }, null, 2));
    return;
  }

  const sql = MIGRATIONS.map((file) =>
    fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", file), "utf8"),
  ).join("\n\n");

  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ["--profile-directory=Default"],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForTimeout(8000);

  const body = await page.locator("body").innerText();
  if (/sign in|log in|Continue with GitHub/i.test(body)) {
    await page.screenshot({ path: "qa-output/supabase-chrome-login-required.png", fullPage: true });
    throw new Error("Supabase login required in Chrome profile");
  }

  const editorSelectors = [".monaco-editor textarea", "textarea[aria-label='Editor content']", ".view-lines"];
  let filled = false;
  for (const selector of editorSelectors) {
    const loc = page.locator(selector).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.insertText(sql);
      filled = true;
      break;
    }
  }

  if (!filled) {
    await page.screenshot({ path: "qa-output/supabase-chrome-no-editor.png", fullPage: true });
    throw new Error("Could not locate SQL editor");
  }

  const run = page.getByRole("button", { name: /Run|Execute|Ctrl\+Enter/i }).first();
  await run.click({ timeout: 20000 });
  await page.waitForTimeout(20000);

  const after = await verifySchema(env);
  await page.screenshot({ path: "qa-output/supabase-credit-report-applied.png", fullPage: true });
  await context.close();

  console.log(JSON.stringify({ ok: after.ok, before, after, migrations: MIGRATIONS }, null, 2));
  if (!after.ok) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
