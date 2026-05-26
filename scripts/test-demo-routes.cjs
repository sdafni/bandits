const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("@playwright/test");
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

async function signIn(page, appUrl, email, password) {
  await page.goto(`${appUrl}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
}

async function assertNoOverflow(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  if (overflow.scrollWidth > overflow.innerWidth + 1) {
    throw new Error(`Overflow detected on ${url}: ${overflow.scrollWidth} > ${overflow.innerWidth}`);
  }

  return overflow;
}

async function main() {
  const env = readEnv();
  const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const landlordEmail = `demo.routes.landlord.${Date.now()}@mailinator.com`;
  const adminEmail = `demo.routes.admin.${Date.now()}@mailinator.com`;
  const password = "Password123!";
  const createdUserIds = [];

  try {
    const landlord = await supabase.auth.admin.createUser({
      email: landlordEmail,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: "Demo Route Landlord",
        role: "landlord",
      },
    });
    if (landlord.error) throw landlord.error;
    createdUserIds.push(landlord.data.user.id);

    const admin = await supabase.auth.admin.createUser({
      email: adminEmail,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: "Demo Route Admin",
        role: "admin",
      },
    });
    if (admin.error) throw admin.error;
    createdUserIds.push(admin.data.user.id);

    await supabase.from("users").upsert(
      [
        {
          id: landlord.data.user.id,
          email: landlordEmail,
          full_name: "Demo Route Landlord",
          role: "landlord",
        },
        {
          id: admin.data.user.id,
          email: adminEmail,
          full_name: "Demo Route Admin",
          role: "admin",
        },
      ],
      { onConflict: "id" },
    );

    const browser = await chromium.launch({ headless: true });

    const publicPage = await browser.newPage();
    await publicPage.goto(`${appUrl}/login`, { waitUntil: "networkidle" });

    const landlordContext = await browser.newContext();
    const landlordPage = await landlordContext.newPage();
    await signIn(landlordPage, appUrl, landlordEmail, password);
    await landlordPage.waitForURL(/\/dashboard/, { timeout: 15000 });
    await landlordPage.goto(`${appUrl}/dashboard/checks/demo-approved-tenant`, { waitUntil: "networkidle" });
    await landlordPage.getByText("Insurance & Protection Eligibility").waitFor({ timeout: 15000 });
    await landlordPage.goto(`${appUrl}/upload/demo-approved-token`, { waitUntil: "networkidle" });
    await landlordPage.getByRole("heading", { name: "Presentation upload state" }).waitFor({ timeout: 15000 });

    const landlordStorageState = await landlordContext.storageState();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, appUrl, adminEmail, password);
    await adminPage.waitForURL(/\/admin\/review/, { timeout: 15000 });
    await adminPage.goto(`${appUrl}/admin/review/demo-approved-tenant`, { waitUntil: "networkidle" });
    await adminPage.getByText("Protection review", { exact: true }).waitFor({ timeout: 15000 });

    const adminStorageState = await adminContext.storageState();
    const responsiveResults = [];

    const checks = [
      { label: "login-mobile", device: devices["iPhone 13"], url: `${appUrl}/login` },
      {
        label: "dashboard-mobile",
        device: devices["Pixel 7"],
        url: `${appUrl}/dashboard`,
        storageState: landlordStorageState,
      },
      {
        label: "case-detail-mobile",
        device: devices["iPhone 13"],
        url: `${appUrl}/dashboard/checks/demo-approved-tenant`,
        storageState: landlordStorageState,
      },
      { label: "upload-mobile", device: devices["iPad Mini"], url: `${appUrl}/upload/demo-approved-token` },
      {
        label: "admin-review-mobile",
        device: devices["Pixel 7"],
        url: `${appUrl}/admin/review`,
        storageState: adminStorageState,
      },
      {
        label: "admin-detail-mobile",
        device: devices["iPhone 13"],
        url: `${appUrl}/admin/review/demo-approved-tenant`,
        storageState: adminStorageState,
      },
    ];

    for (const check of checks) {
      const context = await browser.newContext({
        ...check.device,
        storageState: check.storageState,
      });
      const page = await context.newPage();
      const overflow = await assertNoOverflow(page, check.url);
      responsiveResults.push({ label: check.label, ...overflow });
      await context.close();
    }

    console.log(
      JSON.stringify(
        {
          result: "passed",
          routes: [
            "/login",
            "/dashboard",
            "/dashboard/checks/demo-approved-tenant",
            "/upload/demo-approved-token",
            "/admin/review",
            "/admin/review/demo-approved-tenant",
          ],
          responsiveResults,
        },
        null,
        2,
      ),
    );

    await browser.close();
  } finally {
    for (const userId of createdUserIds.reverse()) {
      await supabase.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
