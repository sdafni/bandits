/**
 * Apply credit report migrations via Supabase Dashboard SQL editor.
 * Usage: node scripts/apply-credit-report-migration-dashboard.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_REF = "wxyywrjblbcpgutyskke";
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
  const sql = MIGRATIONS.map((file) =>
    fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", file), "utf8"),
  ).join("\n\n");

  const before = await verifySchema(env);
  if (before.ok) {
    console.log(JSON.stringify({ ok: true, via: "already_applied", verification: before }, null, 2));
    return;
  }

  const userDataDir = path.join(process.cwd(), "qa-output", "supabase-browser-profile");
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1400, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    await page.goto(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(5000);

    if (/sign-in|login|Log in/i.test(await page.locator("body").innerText())) {
      throw new Error("Supabase dashboard not logged in. Sign in manually in qa-output/supabase-browser-profile and re-run.");
    }

    const editor = page.locator(".monaco-editor textarea").first();
    if (!(await editor.isVisible({ timeout: 30000 }).catch(() => false))) {
      throw new Error("SQL editor not found in Supabase dashboard.");
    }

    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText(sql);
    await page.waitForTimeout(1000);

    const runButton = page.getByRole("button", { name: /^Run$|Execute|Run query/i }).first();
    await runButton.click({ timeout: 15000 });
    await page.waitForTimeout(12000);

    const after = await verifySchema(env);
    console.log(
      JSON.stringify(
        {
          ok: after.ok,
          via: "dashboard_sql_editor",
          before,
          after,
          migrations: MIGRATIONS,
        },
        null,
        2,
      ),
    );
    if (!after.ok) process.exit(1);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
});
