/**
 * Test auth callback flows: token_hash, hash redirect, recovery.
 * Usage: node scripts/test-auth-callback-flows.cjs [appUrl]
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

function readEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index === -1) continue;
      env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
  }
  return env;
}

async function main() {
  const env = readEnv();
  const appUrl = process.argv[2] || env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  async function runCase(name, fn) {
    try {
      await fn();
      results.push({ name, status: "PASS" });
    } catch (error) {
      results.push({ name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) });
    }
  }

  await runCase("token_hash signup confirmation", async () => {
    const email = `callback.token.${Date.now()}@mailinator.com`;
    const link = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password: "Password123!",
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard&email=${encodeURIComponent(email)}`,
      },
    });
    if (link.error) throw link.error;
    const token = link.data.properties.hashed_token;
    await page.goto(
      `${appUrl}/auth/callback?token_hash=${token}&type=signup&next=/dashboard&email=${encodeURIComponent(email)}`,
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await page.waitForTimeout(1500);
    const continueBtn = page.getByTestId("auth-callback-continue");
    if (!(await continueBtn.isVisible().catch(() => false))) {
      throw new Error(`Expected success UI, got: ${await page.locator("h1").first().innerText()}`);
    }
    if (link.data.user?.id) await admin.auth.admin.deleteUser(link.data.user.id);
  });

  await runCase("hash access_token confirmation redirect", async () => {
    const email = `callback.hash.${Date.now()}@mailinator.com`;
    const link = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password: "Password123!",
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard&email=${encodeURIComponent(email)}`,
      },
    });
    if (link.error) throw link.error;
    const verifyRes = await fetch(link.data.properties.action_link, { redirect: "manual" });
    const location = verifyRes.headers.get("location");
    if (!location || !location.includes("access_token=")) {
      throw new Error(`Expected hash redirect, got: ${location}`);
    }
    await page.goto(location, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    if (link.data.user?.id) await admin.auth.admin.deleteUser(link.data.user.id);
  });

  await runCase("token_hash recovery redirect", async () => {
    const email = `callback.recovery.${Date.now()}@mailinator.com`;
    const signup = await admin.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true,
    });
    if (signup.error) throw signup.error;
    const link = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/login/reset-password`,
      },
    });
    if (link.error) throw link.error;
    const token = link.data.properties.hashed_token;
    await page.goto(
      `${appUrl}/auth/callback?token_hash=${token}&type=recovery&next=/login/reset-password`,
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await page.waitForTimeout(1500);
    const continueBtn = page.getByTestId("auth-callback-continue");
    if (!(await continueBtn.isVisible().catch(() => false))) {
      throw new Error(`Expected recovery success UI, got: ${await page.locator("h1").first().innerText()}`);
    }
    const href = await continueBtn.getAttribute("href");
    if (!href || !href.includes("reset-password")) {
      throw new Error(`Expected reset-password link, got: ${href}`);
    }
    if (signup.data.user?.id) await admin.auth.admin.deleteUser(signup.data.user.id);
  });

  await runCase("login session redirect", async () => {
    const email = `callback.login.${Date.now()}@mailinator.com`;
    const created = await admin.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true,
    });
    if (created.error) throw created.error;
    await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const hasTestIds = await page.getByTestId("auth-tab-signin").isVisible().catch(() => false);
    if (hasTestIds) {
      await page.getByTestId("auth-tab-signin").click();
      await page.getByTestId("auth-email-input").fill(email);
      await page.getByTestId("auth-password-input").fill("Password123!");
      await page.getByTestId("auth-signin-submit").click();
    } else {
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').first().fill("Password123!");
      await page.locator('button[type="submit"]').first().click();
    }
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    if (created.data.user?.id) await admin.auth.admin.deleteUser(created.data.user.id);
  });

  await browser.close();
  console.log(JSON.stringify({ appUrl, results }, null, 2));
  if (results.some((result) => result.status === "FAIL")) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
