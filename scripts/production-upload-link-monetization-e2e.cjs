/**
 * Production upload-link monetization E2E + screenshots.
 * Usage: node scripts/production-upload-link-monetization-e2e.cjs [--url https://getsafekey.app]
 */
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

function readEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env.vercel.pulled", ".env.vercel.production"]) {
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

function parseArgs(env) {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf("--url");
  const appUrl = (urlIndex >= 0 ? args[urlIndex + 1] : env.NEXT_PUBLIC_APP_URL || "https://getsafekey.app").replace(
    /\/$/,
    "",
  );
  return { appUrl };
}

async function signIn(page, appUrl, email, password) {
  await page.goto(`${appUrl}/en/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByTestId("auth-tab-signin").click();
  await page.getByTestId("auth-email-input").fill(email);
  await page.getByTestId("auth-password-input").fill(password);
  await page.getByTestId("auth-signin-submit").click();
  await page.waitForURL(/\/dashboard/, { timeout: 120000 });
}

async function seedSubscription(admin, userId, email, appUrl) {
  const runtime = await fetch(`${appUrl}/api/health/stripe/runtime`).then((r) => r.json());
  const basicPrice = runtime?.prices?.basic?.priceId;
  if (!basicPrice) throw new Error("Could not resolve basic Stripe price from runtime health");
  const customerId = `cus_e2e_${Date.now()}`;
  const subscriptionId = `sub_e2e_${Date.now()}`;
  await admin.from("billing_customers").upsert(
    { user_id: userId, stripe_customer_id: customerId, email },
    { onConflict: "user_id" },
  );
  await admin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: basicPrice,
      plan_key: "basic",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function createCheckViaDashboard(page) {
  await page.goto(`${page.url().split("/dashboard")[0]}/en/dashboard`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /new check|νέος έλεγχος/i }).first().click({ timeout: 30000 });
  await page.getByLabel(/property name|όνομα ακινήτου/i).fill("E2E Kolonaki Flat");
  await page.getByLabel(/tenant name|όνομα ενοικιαστ/i).fill("Elena Konstantinou");
  await page.getByRole("button", { name: /continue|συνέχεια|next|επόμενο/i }).click();
  await page.getByLabel(/address|διεύθυνση/i).first().fill("Skoufa 18");
  await page.getByLabel(/city|πόλη/i).fill("Athens");
  await page.getByLabel(/rent|ενοίκιο/i).fill("1200");
  await page.getByRole("button", { name: /continue|συνέχεια|next|επόμενο/i }).click();
  await page.getByRole("button", { name: /save|submit|create|αποθήκευση|δημιουργία/i }).last().click();
  await page.getByRole("heading", { level: 2, name: /saved|αποθηκεύτηκε/i }).waitFor({ timeout: 120000 });
}

async function main() {
  const env = readEnv();
  const { appUrl } = parseArgs(env);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase env for E2E");
  }

  const outDir = path.join(process.cwd(), "qa-output", "upload-link-ux-production");
  fs.mkdirSync(outDir, { recursive: true });

  const email = `uploadlink.e2e.${Date.now()}@mailinator.com`;
  const password = "Password123!";
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { full_name: "Upload Link E2E", role: "landlord" },
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "en-GB",
  });
  await context.addCookies([
    { name: "safekey_locale", value: "en", domain: new URL(appUrl).hostname, path: "/" },
  ]);
  const page = await context.newPage();
  const results = [];

  try {
    await signIn(page, appUrl, email, password);
    await createCheckViaDashboard(page);

    const noPlanPath = path.join(outDir, "02-success-without-active-plan.png");
    await page.screenshot({ path: noPlanPath, fullPage: true });
    results.push({ file: "02-success-without-active-plan.png", ok: true });

    await page.getByRole("button", { name: "Create Upload Link" }).click();
    await page.getByRole("dialog").waitFor({ timeout: 15000 });
    const modalPath = path.join(outDir, "03-plan-required-modal.png");
    await page.screenshot({ path: modalPath, fullPage: true });
    results.push({ file: "03-plan-required-modal.png", ok: true });
    await page.getByRole("button", { name: "Not now" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10000 });

    await seedSubscription(admin, userId, email, appUrl);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 2, name: /saved|ready|αποθηκεύτηκε/i }).waitFor({ timeout: 30000 });

    const withPlanPath = path.join(outDir, "01-success-with-active-plan.png");
    await page.screenshot({ path: withPlanPath, fullPage: true });
    results.push({ file: "01-success-with-active-plan.png", ok: true });

    await page.getByRole("button", { name: "Create Upload Link" }).click();
    await page.getByRole("heading", { level: 2, name: /ready|έτοιμος/i }).waitFor({ timeout: 60000 });
    const linkPath = path.join(outDir, "04-upload-link-generated.png");
    await page.screenshot({ path: linkPath, fullPage: true });
    results.push({ file: "04-upload-link-generated.png", ok: true });
  } catch (error) {
    await page.screenshot({ path: path.join(outDir, "error-state.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    appUrl,
    outDir,
    userEmail: email,
    results,
    monetizationMode: "PREPAY",
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
