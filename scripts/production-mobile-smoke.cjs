/**
 * Production mobile smoke matrix:
 * - Android Chrome (chromium + Pixel profile)
 * - iPhone Safari (webkit + iPhone profile)
 * - Gmail in-app browser profile (chromium mobile UA)
 * - WhatsApp in-app browser profile (chromium mobile UA)
 *
 * Usage:
 *   node scripts/production-mobile-smoke.cjs --url https://getsafekey.app
 */
const { chromium, webkit, devices } = require("@playwright/test");

function parseArgs() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf("--url");
  const appUrl = (urlIndex >= 0 ? args[urlIndex + 1] : process.env.NEXT_PUBLIC_APP_URL || "https://getsafekey.app").replace(/\/$/, "");
  return { appUrl };
}

async function assertMobilePage(page, url, label) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (!response || response.status() >= 500) {
    throw new Error(`${label}: HTTP ${response?.status?.() ?? "no-response"} at ${url}`);
  }
  await page.waitForTimeout(800);
  const metrics = await page.evaluate(() => ({
    href: location.href,
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (metrics.scrollWidth > metrics.innerWidth + 1) {
    throw new Error(`${label}: horizontal overflow ${metrics.scrollWidth} > ${metrics.innerWidth}`);
  }
  return metrics;
}

async function runProfile(browserType, contextOptions, appUrl, label) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const checks = [];
    checks.push(await assertMobilePage(page, `${appUrl}/`, `${label}:home`));
    checks.push(await assertMobilePage(page, `${appUrl}/login`, `${label}:login`));
    checks.push(await assertMobilePage(page, `${appUrl}/login/forgot-password`, `${label}:forgot-password`));
    checks.push(await assertMobilePage(page, `${appUrl}/auth/callback`, `${label}:auth-callback`));

    await context.close();
    return { label, ok: true, checks };
  } catch (error) {
    return { label, ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await browser.close();
  }
}

async function main() {
  const { appUrl } = parseArgs();

  const iphoneDevice = devices["iPhone 13"];
  const androidDevice = devices["Pixel 7"];

  const gmailUA =
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 GSA/14.20.16.29.arm64";
  const whatsappUA =
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.10.78";

  const results = [];
  results.push(await runProfile(chromium, { ...androidDevice }, appUrl, "android-chrome"));
  results.push(await runProfile(webkit, { ...iphoneDevice }, appUrl, "iphone-safari"));
  results.push(
    await runProfile(
      chromium,
      { ...androidDevice, userAgent: gmailUA },
      appUrl,
      "gmail-inapp",
    ),
  );
  results.push(
    await runProfile(
      chromium,
      { ...androidDevice, userAgent: whatsappUA },
      appUrl,
      "whatsapp-inapp",
    ),
  );

  const failures = results.filter((item) => !item.ok);
  console.log(
    JSON.stringify(
      {
        result: failures.length === 0 ? "passed" : "failed",
        appUrl,
        profiles: results,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ result: "failed", error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
