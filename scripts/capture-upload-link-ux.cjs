/**
 * Capture upload-link UX screenshots from local dev preview routes.
 * Usage: node scripts/capture-upload-link-ux.cjs [baseUrl]
 */
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("@playwright/test");

const baseUrl = process.argv[2] || "http://localhost:3000";
const outDir = path.join(process.cwd(), "qa-output", "upload-link-ux");

const captures = [
  {
    file: "01-success-with-active-plan.png",
    url: "/dev/upload-link-ux?state=with-plan",
    label: "Success screen — active plan (Create Upload Link enabled)",
  },
  {
    file: "02-success-without-active-plan.png",
    url: "/dev/upload-link-ux?state=no-plan",
    label: "Success screen — no active plan",
  },
  {
    file: "03-plan-required-modal.png",
    url: "/dev/upload-link-ux?state=no-plan",
    label: "Plan required modal after clicking Create Upload Link",
    clickCreateUploadLink: true,
  },
  {
    file: "04-upload-link-generated.png",
    url: "/dev/upload-link-ux?state=link-ready",
    label: "Upload link generated",
  },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "en-GB",
  });
  await context.addCookies([
    {
      name: "safekey_locale",
      value: "en",
      domain: "localhost",
      path: "/",
    },
  ]);
  const page = await context.newPage();

  const results = [];

  for (const capture of captures) {
    const target = `${baseUrl.replace(/\/$/, "")}${capture.url}`;
    process.stdout.write(`Capturing ${capture.file}...\n`);

    try {
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByRole("heading", { level: 2 }).first().waitFor({ timeout: 60_000 });

      if (capture.clickCreateUploadLink) {
        await page.getByRole("button", { name: "Create Upload Link" }).click();
        await page.getByRole("dialog").waitFor({ timeout: 15_000 });
      }

      await page.waitForTimeout(800);
      const filePath = path.join(outDir, capture.file);
      await page.screenshot({ path: filePath, fullPage: true });
      results.push({ ...capture, filePath, ok: true });
    } catch (error) {
      results.push({
        ...capture,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await browser.close();

  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    outDir,
    results,
  };

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
