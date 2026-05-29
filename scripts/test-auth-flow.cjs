const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

function readEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const contents = fs.readFileSync(envPath, "utf8");
  const env = {};

  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }

  return {
    ...env,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS || env.ADMIN_EMAILS,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function main() {
  const env = readEnv();
  const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const password = "Password123!";
  const email = `auth.flow.${Date.now()}@mailinator.com`;
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId = null;

  try {
    const generated = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (generated.error) throw generated.error;

    userId = generated.data.user?.id ?? null;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(generated.data.properties.action_link, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    if (/\/auth\/callback/.test(page.url())) {
      const callbackContinue = page.getByTestId("auth-callback-continue");
      if (await callbackContinue.isVisible().catch(() => false)) {
        await callbackContinue.click();
      } else {
        const fallbackContinue = page.getByRole("link", {
          name: /continue to dashboard|sign in|σύνδεση|επιστροφή|συνέχεια/i,
        }).first();
        if (await fallbackContinue.isVisible().catch(() => false)) {
          await fallbackContinue.click();
        }
      }
    }
    await page.waitForFunction(
      () =>
        window.location.pathname === "/dashboard" ||
        window.location.pathname === "/login" ||
        window.location.pathname === "/auth/callback",
      null,
      { timeout: 30000 },
    );
    const afterConfirm = page.url();

    await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded" });
    const hasTestIds = await page.getByTestId("auth-tab-signin").isVisible().catch(() => false);
    if (hasTestIds) {
      await page.getByTestId("auth-tab-signin").click();
      await page.getByTestId("auth-email-input").fill(email);
      await page.getByTestId("auth-password-input").fill(password);
      await page.getByTestId("auth-signin-submit").click();
    } else {
      await page.getByRole("button", { name: /sign in|σύνδεση/i }).first().click();
      await page.getByLabel(/email/i).fill(email);
      await page.locator('input[name="password"]').first().fill(password);
      await page.getByRole("button", { name: /sign in|σύνδεση/i }).last().click();
    }
    await page.waitForFunction(() => window.location.pathname === "/dashboard", null, { timeout: 15000 });

    console.log(
      JSON.stringify(
        {
          email,
          result: "passed",
          afterConfirm,
          afterSignIn: page.url(),
        },
        null,
        2,
      ),
    );

    await browser.close();
  } finally {
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
