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

    await page.goto(generated.data.properties.action_link);
    await page.waitForFunction(() => window.location.pathname === "/dashboard", null, { timeout: 15000 });
    const afterConfirm = page.url();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForFunction(() => window.location.pathname === "/", null, { timeout: 15000 });

    await page.goto(`${appUrl}/login`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Sign in" }).first().click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).last().click();
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
