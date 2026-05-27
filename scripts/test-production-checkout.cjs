/**
 * Production checkout E2E: sign in, POST checkout API, verify Stripe redirect URL.
 * Requires .env.local with Supabase service role + app URL (or env vars).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

function readEnv() {
  const candidates = [".env.local", ".env.vercel.pulled"];
  const env = { ...process.env };

  for (const name of candidates) {
    const envPath = path.join(process.cwd(), name);
    if (!fs.existsSync(envPath)) continue;

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index === -1) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value) env[key] = value;
    }
  }

  return env;
}

async function main() {
  const env = readEnv();
  const appUrl = process.argv[2] || env.NEXT_PUBLIC_APP_URL || "https://getsafekey.app";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, anon key).");
  }

  const email = `checkout.verify.${Date.now()}@mailinator.com`;
  const password = "Password123!";
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\n=== Production checkout test ===\n");
  console.log("App URL:", appUrl);

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { full_name: "Checkout Verify", role: "landlord" },
  });

  if (created.error) {
    throw created.error;
  }

  const userId = created.data.user?.id ?? null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const checkoutResponses = [];
  page.on("response", async (response) => {
    if (response.url().includes("/api/billing/subscription-checkout")) {
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => null);
      }
      checkoutResponses.push({ status: response.status(), body });
      console.log("\n[checkout API]", response.status(), JSON.stringify(body, null, 2));
    }
  });

  page.on("console", (msg) => {
    if (msg.text().includes("[safekey-checkout]")) {
      console.log("[browser]", msg.text());
    }
  });

  await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByRole("button", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await page.waitForFunction(() => window.location.pathname.startsWith("/dashboard"), null, {
    timeout: 120000,
  });

  await page.goto(`${appUrl}/dashboard/billing`, { waitUntil: "domcontentloaded", timeout: 120000 });
  console.log("Billing page URL:", page.url());

  const subscribeButton = page.getByRole("button", { name: /Subscribe/i }).first();
  const hasSubscribe = await subscribeButton.isVisible().catch(() => false);
  console.log("Subscribe button visible:", hasSubscribe);

  const apiResult = await page.request.post(`${appUrl}/api/billing/subscription-checkout`, {
    data: { planKey: "pro" },
    headers: { "Content-Type": "application/json" },
  });
  const apiRaw = await apiResult.text();
  let apiBody = null;
  try {
    apiBody = JSON.parse(apiRaw);
  } catch {
    apiBody = { raw: apiRaw.slice(0, 500) };
  }
  console.log("\n[direct API POST]", apiResult.status(), JSON.stringify(apiBody, null, 2));

  const pageText = await page.locator("body").innerText().catch(() => "");
  if (pageText.includes("Billing tables")) {
    console.error("\nBLOCKER: Billing migrations not applied on production Supabase.");
  }
  if (pageText.includes("Stripe production keys")) {
    console.error("\nBLOCKER: Stripe env vars missing in production.");
  }
  checkoutResponses.push({ status: apiResult.status(), body: apiBody });

  if (apiBody?.ok && apiBody.url) {
    await page.goto(apiBody.url, { waitUntil: "domcontentloaded", timeout: 120000 });
  } else if (hasSubscribe) {
    await subscribeButton.click();
    await page.waitForTimeout(8000);
  }

  const currentUrl = page.url();
  console.log("\nFinal URL:", currentUrl);

  if (checkoutResponses.length === 0) {
    console.error("FAIL: No POST to /api/billing/subscription-checkout observed.");
  }

  const last = checkoutResponses[checkoutResponses.length - 1];
  if (last?.body?.ok && last.body.url) {
    console.log("API returned checkout URL:", last.body.url.slice(0, 100));
  } else if (last?.body) {
    console.error("API error:", last.body.error, last.body.detail || "");
  }

  const onStripe = /checkout\.stripe\.com/.test(currentUrl);
  if (onStripe) {
    console.log("\nSUCCESS: Browser redirected to Stripe Checkout.");
    await browser.close();
    process.exit(0);
  }

  const errorText = await page.locator(".status-message").first().textContent().catch(() => null);
  if (errorText) {
    console.error("\nUI error:", errorText);
  }

  await browser.close();

  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }

  process.exit(onStripe ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
