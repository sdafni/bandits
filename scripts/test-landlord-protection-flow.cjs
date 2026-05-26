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

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const env = readEnv();
  const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const landlordEmail = `landlord.flow.${Date.now()}@mailinator.com`;
  const adminEmail = `admin.flow.${Date.now()}@mailinator.com`;
  const password = "Password123!";
  const createdUserIds = [];

  try {
    const landlord = await supabase.auth.admin.createUser({
      email: landlordEmail,
      email_confirm: true,
      password,
      user_metadata: {
        company_name: "SafeKey Test Landlord",
        full_name: "Landlord Flow Test",
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
        full_name: "Admin Flow Test",
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
          full_name: "Landlord Flow Test",
          role: "landlord",
        },
        {
          id: admin.data.user.id,
          email: adminEmail,
          full_name: "Admin Flow Test",
          role: "admin",
        },
      ],
      { onConflict: "id" },
    );

    const browser = await chromium.launch({ headless: true });

    const landlordContext = await browser.newContext();
    const landlordPage = await landlordContext.newPage();
    await signIn(landlordPage, appUrl, landlordEmail, password);
    await landlordPage.waitForFunction(() => window.location.pathname === "/dashboard", null, {
      timeout: 15000,
    });

    await landlordPage.getByLabel("Property name").fill("Kolonaki Penthouse");
    await landlordPage.getByLabel("Monthly rent (EUR)").fill("1200");
    await landlordPage.getByLabel("Property address").fill("12 Leof. Kifisias");
    await landlordPage.getByLabel("City").fill("Athens");
    await landlordPage.getByLabel("Postal code").fill("11526");
    await landlordPage.getByLabel("Applicant full name").fill("Maria Papadopoulou");
    await landlordPage.getByLabel("Applicant email").fill("tenant.flow@mailinator.com");
    await landlordPage.getByLabel("Applicant phone").fill("+306900000000");
    await landlordPage.getByRole("button", { name: "Create SafeKey check" }).click();
    await landlordPage.waitForURL(/\/dashboard\/checks\//, { timeout: 15000 });

    const landlordCaseUrl = landlordPage.url();
    const checkId = landlordCaseUrl.split("/").at(-1);
    if (!checkId) {
      throw new Error("Could not determine the tenant check id from the landlord case URL.");
    }
    const caseBody = await landlordPage.locator("body").innerText();
    const uploadUrlMatch = caseBody.match(new RegExp(`${escapeForRegExp(appUrl)}/upload/[^\\s]+`));
    if (!uploadUrlMatch) {
      throw new Error("Could not find the secure upload URL on the landlord case page.");
    }
    const uploadUrl = uploadUrlMatch[0];

    const tenantPage = await landlordContext.newPage();
    await tenantPage.goto(uploadUrl, { waitUntil: "networkidle" });
    await tenantPage.getByLabel("Email").fill("tenant.flow@mailinator.com");
    await tenantPage.getByLabel("Phone").fill("+306900000000");
    await tenantPage.getByLabel("Current address").fill("8 Irodotou, Athens");
    await tenantPage.getByLabel("Employment status").selectOption("full_time");
    await tenantPage.getByLabel("Employer name").fill("SafeKey Labs");
    await tenantPage.getByLabel("Monthly income (EUR)").fill("4200");
    await tenantPage.getByLabel("Expected move-in date").fill("2026-06-15");
    await tenantPage.getByLabel("Document category").selectOption("government_id");
    await tenantPage.getByLabel("Notes for the reviewer").fill("Stable employment and ready to move.");
    await tenantPage.getByLabel("Upload documents").setInputFiles([
      {
        name: "identity-proof.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Government ID placeholder text for SafeKey test flow."),
      },
    ]);
    await tenantPage.getByRole("checkbox").check();
    await tenantPage.getByRole("button", { name: "Submit secure document batch" }).click();
    await tenantPage.waitForTimeout(2500);

    const reviewTimestamp = new Date().toISOString();
    const seededReport = await supabase.from("ai_reports").upsert(
      {
        generated_by: "integration-seed",
        missing_documents: ["proof_of_income", "employment_letter", "bank_statement"],
        recommendation: "conditional",
        reasoning: {
          debtToIncomeRatio: 0.29,
          documentCompleteness: 52,
          employmentResidencyConfidence: 76,
          extractedSignals: [],
          identityConfidence: 88,
          incomeStability: 74,
          missingDocumentCount: 3,
          rentAffordability: 81,
          reviewNotes: ["Seeded report for landlord protection flow verification."],
        },
        red_flags: ["Further income evidence is still required for a full protection match."],
        score: 78,
        strengths: ["Identity evidence uploaded.", "Rent affordability appears acceptable."],
        summary:
          "Seeded SafeKey report for end-to-end verification. The case is conditionally approved pending more income documentation.",
        tenant_check_id: checkId,
      },
      { onConflict: "tenant_check_id" },
    );
    if (seededReport.error) throw seededReport.error;

    const seededCheck = await supabase
      .from("tenant_checks")
      .update({
        review_completed_at: reviewTimestamp,
        review_requested_at: reviewTimestamp,
        status: "report_ready",
      })
      .eq("id", checkId);
    if (seededCheck.error) throw seededCheck.error;

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, appUrl, adminEmail, password);
    await adminPage.waitForFunction(() => window.location.pathname === "/admin/review", null, {
      timeout: 15000,
    });

    await adminPage.goto(`${appUrl}/admin/review/${checkId}`, { waitUntil: "networkidle" });
    await adminPage.reload({ waitUntil: "networkidle" });
    await adminPage.getByText("Current SafeKey decision output").waitFor({ timeout: 20000 });
    await adminPage.getByText("Protection review").waitFor({ timeout: 15000 });
    await adminPage.getByRole("button", { name: "Approve" }).waitFor({ timeout: 15000 });

    await landlordPage.goto(landlordCaseUrl, { waitUntil: "networkidle" });
    await landlordPage.getByText("SafeKey recommendation").waitFor({ timeout: 15000 });
    await landlordPage.getByText("Insurance & Protection Eligibility").waitFor({ timeout: 15000 });
    await landlordPage.getByText("Deposit protection option").waitFor({ timeout: 15000 });

    const landlordStorageState = await landlordContext.storageState();
    const responsiveResults = [];
    const responsiveTargets = [
      { device: { viewport: { height: 844, width: 390 } }, label: "desktop-public", url: `${appUrl}/` },
    ];

    const mobileTargets = [
      { device: devices["iPhone 13"], label: "iphone-dashboard", url: `${appUrl}/dashboard`, authenticated: true },
      { device: devices["Pixel 7"], label: "android-case-detail", url: landlordCaseUrl, authenticated: true },
      { device: devices["iPad Mini"], label: "tablet-upload", url: uploadUrl, authenticated: false },
    ];

    for (const target of responsiveTargets) {
      const context = await browser.newContext({ viewport: target.device.viewport });
      const page = await context.newPage();
      const result = await assertNoOverflow(page, target.url);
      responsiveResults.push({ label: target.label, ...result });
      await context.close();
    }

    for (const target of mobileTargets) {
      const context = await browser.newContext({
        ...target.device,
        storageState: target.authenticated ? landlordStorageState : undefined,
      });
      const page = await context.newPage();
      const result = await assertNoOverflow(page, target.url);
      responsiveResults.push({ label: target.label, ...result });
      await context.close();
    }

    console.log(
      JSON.stringify(
        {
          result: "passed",
          landlordCaseUrl,
          uploadUrl,
          adminReviewUrl: adminPage.url(),
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
