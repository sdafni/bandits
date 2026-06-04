/**
 * Post-deploy production UX verification.
 * Usage: node scripts/production-ux-verification.cjs [--url https://getsafekey.app]
 */
const fs = require("fs");
const path = require("path");
const { chromium, webkit, devices } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

const PASSWORD = "Password123!";
const NEW_PASSWORD = "Password456!";

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

function parseArgs() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf("--url");
  const appUrl = (urlIndex >= 0 ? args[urlIndex + 1] : process.env.NEXT_PUBLIC_APP_URL || "https://getsafekey.app").replace(
    /\/$/,
    "",
  );
  return { appUrl };
}

async function main() {
  const { appUrl } = parseArgs();
  const env = readEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const report = {
    appUrl,
    verifiedAt: new Date().toISOString(),
    checks: [],
    verdict: "NOT READY",
  };

  function record(name, status, detail = null) {
    report.checks.push({ name, status, detail });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  let cleanupUserId = null;
  const runId = Date.now();
  const landlordEmail = `sk.ux.verify.${runId}@mailinator.com`;

  try {
    // 1. Login page + form at #auth
    await page.goto(`${appUrl}/login#auth`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const loginFormVisible = await page.getByTestId("auth-tab-signin").isVisible().catch(() => false);
    const headerCount = await page.locator("header").count();
    record(
      "Login page loads with single header and auth form",
      loginFormVisible && headerCount === 1 ? "PASS" : "FAIL",
      loginFormVisible ? `headers=${headerCount}` : "auth form not visible",
    );

    // 2. Create account
    await page.getByTestId("auth-tab-signup").click();
    const signupForm = page.getByTestId("auth-signup-form");
    await signupForm.locator('input[name="full_name"]').fill("UX Verify Landlord");
    await signupForm.locator('input[name="company_name"]').fill("Verify Properties");
    await signupForm.locator('input[name="email"]').fill(landlordEmail);
    await signupForm.locator('input[name="password"]').fill(PASSWORD);
    await signupForm.locator('input[name="confirm_password"]').fill(PASSWORD);
    await signupForm.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 45000 }).catch(() => null);
    const signupOk = /\/dashboard/.test(page.url());
    record("Create account reaches dashboard", signupOk ? "PASS" : "FAIL", page.url());

    // 1b. Login with same account (sign out first if needed)
    await page.context().clearCookies();
    await page.goto(`${appUrl}/login#auth`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByTestId("auth-tab-signin").click();
    await page.getByTestId("auth-email-input").fill(landlordEmail);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-signin-submit").click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => null);
    record("Login with new account", /\/dashboard/.test(page.url()) ? "PASS" : "FAIL", page.url());

    // 3. Password reset end-to-end
    await page.context().clearCookies();
    const recoveryEmail = `sk.ux.recovery.${runId}@mailinator.com`;
    const created = await admin.auth.admin.createUser({
      email: recoveryEmail,
      password: PASSWORD,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    cleanupUserId = created.data.user?.id ?? null;

    const recoveryLink = await admin.auth.admin.generateLink({
      type: "recovery",
      email: recoveryEmail,
      options: { redirectTo: `${appUrl}/auth/callback?next=/login/reset-password` },
    });
    if (recoveryLink.error) throw recoveryLink.error;
    const token = recoveryLink.data.properties.hashed_token;
    await page.goto(
      `${appUrl}/auth/callback?token_hash=${token}&type=recovery&next=/login/reset-password`,
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await page.waitForURL(/\/login\/reset-password/, { timeout: 20000 }).catch(() => null);
    const onResetPage = /\/login\/reset-password/.test(page.url());
    if (onResetPage) {
      await page.locator('input[name="password"]').first().fill(NEW_PASSWORD);
      await page.locator('input[name="confirm_password"]').fill(NEW_PASSWORD);
      await page.getByTestId("reset-password-submit").click();
      await page.waitForTimeout(2500);
    }
    await page.context().clearCookies();
    await page.goto(`${appUrl}/login#auth`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByTestId("auth-tab-signin").click();
    await page.getByTestId("auth-email-input").fill(recoveryEmail);
    await page.getByTestId("auth-password-input").fill(NEW_PASSWORD);
    await page.getByTestId("auth-signin-submit").click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => null);
    record(
      "Password reset completes and new password signs in",
      /\/dashboard/.test(page.url()) ? "PASS" : "FAIL",
      page.url(),
    );
    if (cleanupUserId) {
      await admin.auth.admin.deleteUser(cleanupUserId);
      cleanupUserId = null;
    }

    // 4. Pricing buttons on homepage
    await page.goto(`${appUrl}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const pricingSection = page.locator("#pricing");
    await pricingSection.scrollIntoViewIfNeeded().catch(() => {});
    const pricingVisible = await pricingSection.isVisible().catch(() => false);
    const pricingOrderOk = await page.evaluate(() => {
      const hero = document.querySelector("[data-testid='home-hero']");
      const pricing = document.getElementById("pricing");
      const sample = document.getElementById("sample-report");
      const how = document.getElementById("how-it-works");
      if (!hero || !pricing || !sample || !how) return false;
      return hero.compareDocumentPosition(pricing) === 4 && pricing.compareDocumentPosition(sample) === 4;
    });
    const planLink = page.locator("#pricing a[href*='login']").first();
    const planHref = (await planLink.getAttribute("href").catch(() => null)) ?? "";
    record(
      "Pricing section early with plan CTAs to login",
      pricingVisible && pricingOrderOk && planHref.includes("login") ? "PASS" : "FAIL",
      `visible=${pricingVisible} order=${pricingOrderOk} href=${planHref}`,
    );

    // 5. Sample report page
    const sampleResponse = await page.goto(`${appUrl}/sample-report`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const sampleOk =
      (sampleResponse?.status() ?? 500) < 400 && (await page.getByTestId("sample-report-page").isVisible().catch(() => false));
    const pdfResponse = await page.request.get(`${appUrl}/api/sample-report/pdf`);
    record(
      "Sample report page and PDF preview API",
      sampleOk && pdfResponse.ok() ? "PASS" : "FAIL",
      `page=${sampleResponse?.status()} pdf=${pdfResponse.status()}`,
    );

    await browser.close();

    // 6–7. Mobile Safari + Chrome
    async function mobileCheck(browserType, contextOptions, label) {
      const mobileBrowser = await browserType.launch({ headless: true });
      try {
        const context = await mobileBrowser.newContext(contextOptions);
        const mobilePage = await context.newPage();
        for (const route of ["/", "/login#auth", "/sample-report"]) {
          const response = await mobilePage.goto(`${appUrl}${route}`, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          if (!response || response.status() >= 500) {
            throw new Error(`${route}: HTTP ${response?.status?.() ?? "none"}`);
          }
          const overflow = await mobilePage.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
          );
          if (overflow) {
            throw new Error(`${route}: horizontal overflow`);
          }
        }
        await context.close();
        record(label, "PASS");
      } catch (error) {
        record(label, "FAIL", error instanceof Error ? error.message : String(error));
      } finally {
        await mobileBrowser.close();
      }
    }

    await mobileCheck(webkit, { ...devices["iPhone 13"] }, "Mobile Safari (iPhone)");
    await mobileCheck(chromium, { ...devices["Pixel 7"] }, "Mobile Chrome (Android)");

    const failures = report.checks.filter((check) => check.status === "FAIL");
    report.verdict = failures.length === 0 ? "READY" : "NOT READY";
    console.log(JSON.stringify(report, null, 2));
    process.exit(failures.length === 0 ? 0 : 1);
  } catch (error) {
    report.verdict = "NOT READY";
    report.error = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify(report, null, 2));
    if (cleanupUserId) {
      await admin.auth.admin.deleteUser(cleanupUserId).catch(() => {});
    }
    process.exit(1);
  } finally {
    try {
      await browser.close();
    } catch {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
