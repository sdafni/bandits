/**
 * Production i18n + mobile locale switch validation.
 *
 * Usage:
 *   node scripts/production-i18n-mobile-validation.cjs --url https://getsafekey.app
 */
const { chromium, webkit, devices } = require("@playwright/test");

const GREEK_HERO = "Γνώριζε ποιος παίρνει το κλειδί";
const ENGLISH_HERO = "Know Who Gets the Key";

function parseArgs() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf("--url");
  const appUrl = (urlIndex >= 0 ? args[urlIndex + 1] : process.env.NEXT_PUBLIC_APP_URL || "https://getsafekey.app").replace(
    /\/$/,
    "",
  );
  return { appUrl };
}

async function assertLocaleSwitch(page, appUrl, label) {
  const results = [];

  await page.goto(`${appUrl}/el`, { waitUntil: "networkidle", timeout: 60000 });

  const elHero = page.locator("[data-testid='home-hero'] h1");
  await elHero.waitFor({ state: "visible", timeout: 15000 });
  const elText = await elHero.innerText();
  if (!elText.includes(GREEK_HERO)) {
    throw new Error(`${label}: expected Greek hero on /el, got: ${elText.slice(0, 80)}`);
  }
  results.push({ check: "greek-default-hero", ok: true });

  const enButton = page.locator("[data-testid='language-switch-en']");
  await enButton.waitFor({ state: "visible" });

  const navTypeBefore = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.type ?? "navigate");

  const started = Date.now();
  await enButton.click();

  await page.waitForFunction(
    (englishHero) => {
      const hero = document.querySelector("[data-testid='home-hero'] h1");
      return hero && hero.textContent && hero.textContent.includes(englishHero);
    },
    ENGLISH_HERO,
    { timeout: 3000 },
  );
  const switchMs = Date.now() - started;

  const navTypeAfter = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.type ?? "navigate");
  if (navTypeAfter === "reload" && navTypeBefore !== "reload") {
    throw new Error(`${label}: language switch triggered a full document reload`);
  }

  if (switchMs > 2000) {
    throw new Error(`${label}: locale switch took ${switchMs}ms (expected < 2000ms)`);
  }

  const enText = await elHero.innerText();
  if (!enText.includes(ENGLISH_HERO)) {
    throw new Error(`${label}: expected English hero after one tap, got: ${enText.slice(0, 80)}`);
  }

  const href = await page.evaluate(() => location.pathname);
  if (!href.startsWith("/en")) {
    throw new Error(`${label}: expected /en path after switch, got ${href}`);
  }

  results.push({ check: "single-tap-instant-en", ok: true, switchMs });
  return results;
}

async function runProfile(browserType, contextOptions, appUrl, label) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ ...contextOptions, baseURL: appUrl });
    const page = await context.newPage();
    const checks = await assertLocaleSwitch(page, appUrl, label);
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

  const results = [];
  results.push(await runProfile(chromium, { ...androidDevice }, appUrl, "android-chrome"));
  results.push(await runProfile(webkit, { ...iphoneDevice }, appUrl, "iphone-safari"));

  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ appUrl, results }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
    console.error(`\n${failed.length} profile(s) failed i18n validation.`);
  } else {
    console.log("\nAll i18n mobile profiles passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
