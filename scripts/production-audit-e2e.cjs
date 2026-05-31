/**
 * SafeKey production audit — 9-step E2E against https://getsafekey.app
 * Usage: node scripts/production-audit-e2e.cjs
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { chromium } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

const APP_URL = "https://getsafekey.app";
const PASSWORD = "Password123!";
const VIEWPORT = { width: 1280, height: 900 };

const LANDLORD = { fullName: "Audit Landlord", company: "SafeKey Audit Co" };
const TENANT = {
  fullName: "Audit Tenant",
  phone: "+30 694 000 1234",
  address: "Ermou 12, Athens 10563",
  employer: "Audit Corp SA",
  monthlyIncome: "3800",
};
const PROPERTY = {
  name: "Audit Flat Kolonaki",
  rent: "1100",
  address: "Skoufa 5",
  city: "Athens",
  postal: "10673",
};

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
      const value = line.slice(index + 1).trim();
      if (value && !env[key]) env[key] = value;
    }
  }
  return env;
}

function auditStep(num, name, status, screenshot = null, error = null, detail = null) {
  return { step: num, name, status, screenshot, error, detail };
}

async function shot(page, dir, name) {
  const filePath = path.join(dir, name);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function pollMailinator(inbox, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(
        `https://mailinator.com/api/v2/domains/public/inboxes/${encodeURIComponent(inbox)}`,
        { headers: { Accept: "application/json" } },
      );
      if (response.ok) {
        const json = await response.json();
        const msgs = json.msgs ?? json.messages ?? [];
        if (msgs.length > 0) return msgs;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  return [];
}

async function fetchMailinatorMessage(inbox, messageId) {
  const response = await fetch(
    `https://mailinator.com/api/v2/domains/public/inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(messageId)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return null;
  return response.json();
}

function extractConfirmLink(body) {
  const patterns = [
    /https:\/\/[^\s"'<>]+auth\/callback[^\s"'<>]*/i,
    /https:\/\/[^\s"'<>]+supabase\.co\/auth\/v1\/verify[^\s"'<>]*/i,
    /https:\/\/[^\s"'<>]+confirm[^\s"'<>]*/i,
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[0]) return match[0].replace(/&amp;/g, "&");
  }
  return null;
}

async function establishSession(page, accessToken, refreshToken) {
  await page.context().request.post(`${APP_URL}/auth/callback/session`, {
    data: { accessToken, refreshToken },
  });
}

async function signInLandlord(page, email, password) {
  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByTestId("auth-tab-signin").click();
  const emailInput = page.getByTestId("auth-email-input");
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await page.getByTestId("auth-password-input").fill(password);
    const submit = page.getByTestId("auth-signin-submit");
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
    } else {
      await page.locator('form[data-testid="auth-signin-form"] button[type="submit"], form button[type="submit"]').first().click();
    }
  } else {
    await page.locator('input[name="email"]').first().fill(email);
    await page.locator('input[name="password"]').first().fill(password);
    await page.getByRole("button", { name: /sign in|σύνδεση/i }).last().click();
  }
  await page.waitForURL(/\/dashboard/, { timeout: 45000 }).catch(() => undefined);
}

function createRichPdf(filePath, lines) {
  const textOps = lines
    .map((line, index) => `1 0 0 1 72 ${720 - index * 16} Tm (${line.replace(/[()\\]/g, "")}) Tj`)
    .join("\n");
  const stream = `BT /F1 11 Tf\n${textOps}\nET`;
  const streamLen = Buffer.byteLength(stream, "utf8");
  fs.writeFileSync(
    filePath,
    `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length ${streamLen} >>stream
${stream}
endstream endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000${(400 + streamLen).toString().padStart(3, "0")} 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
${450 + streamLen}
%%EOF`,
  );
}

async function seedSubscription(admin, userId, email) {
  const runtime = await fetch(`${APP_URL}/api/health/stripe/runtime`).then((r) => r.json());
  const basicPrice = runtime?.prices?.basic?.priceId ?? "price_1TbeAQP2qCjvfVhK1UKC0tOD";
  const customerId = `cus_audit_${Date.now()}`;
  const subscriptionId = `sub_audit_${Date.now()}`;
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

async function fillTenantUploadForm(uploadPage, tenantEmail, documentType, pdfPath) {
  await uploadPage.locator('input[name="full_name"]').fill(TENANT.fullName);
  await uploadPage.locator('input[name="email"]').fill(tenantEmail);
  await uploadPage.locator('input[name="phone"]').fill(TENANT.phone);
  await uploadPage.locator('input[name="current_address"]').fill(TENANT.address);
  await uploadPage.locator('input[name="monthly_income"]').fill(TENANT.monthlyIncome);
  await uploadPage.locator('select[name="employment_status"]').selectOption("full_time");
  await uploadPage.locator('input[name="employer_name"]').fill(TENANT.employer);
  await uploadPage.locator('select[name="document_type"]').selectOption(documentType);
  await uploadPage.locator('input[name="documents"]').setInputFiles(pdfPath);
  await uploadPage.locator('input[name="consent_confirmed"]').check();
  await uploadPage.getByRole("button", { name: /Submit|Upload|Υποβολή/i }).first().click();
}

async function pollAiReport(admin, checkId, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await admin.from("ai_reports").select("*").eq("tenant_check_id", checkId).maybeSingle();
    if (data?.score != null && data?.recommendation) return data;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  const { data } = await admin.from("ai_reports").select("*").eq("tenant_check_id", checkId).maybeSingle();
  return data ?? null;
}

async function main() {
  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(JSON.stringify({ error: "Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }));
    process.exit(1);
  }

  const runId = Date.now();
  const outDir = path.join(process.cwd(), "qa-output", `production-audit-${runId}`);
  fs.mkdirSync(outDir, { recursive: true });

  const landlordInbox = `sk.audit.${runId}`;
  const tenantInbox = `sk.tenant.${runId}`;
  const landlordEmail = `${landlordInbox}@mailinator.com`;
  const tenantEmail = `${tenantInbox}@mailinator.com`;

  const report = {
    appUrl: APP_URL,
    startedAt: new Date().toISOString(),
    outputDir: outDir,
    personas: { landlordEmail, tenantEmail },
    steps: [],
    setup: {},
  };

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId = null;
  let checkId = null;
  let uploadToken = null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    // ── 1. Landlord signup ───────────────────────────────────────────────
    let step1Status = "FAIL";
    let step1Error = null;
    let step1Detail = {};
    let step1Shot = null;
    try {
      await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle", timeout: 60000 });
      await page.getByTestId("auth-panels").waitFor({ state: "visible", timeout: 30000 });
      await page.getByTestId("auth-tab-signup").click();
      const signupForm = page.getByTestId("auth-signup-form");
      await signupForm.locator('input[name="full_name"]').fill(LANDLORD.fullName);
      await signupForm.locator('input[name="company_name"]').fill(LANDLORD.company);
      await signupForm.locator('input[name="email"]').fill(landlordEmail);
      await signupForm.locator('input[name="password"]').pressSequentially(PASSWORD, { delay: 20 });
      await signupForm.locator('input[name="confirm_password"]').pressSequentially(PASSWORD, { delay: 20 });
      step1Shot = await shot(page, outDir, "01-landlord-signup.png");
      await signupForm.locator('button[type="submit"]').click();
      await page.waitForTimeout(4000);

      const signupSuccessVisible = await page
        .getByTestId("auth-signup-success")
        .waitFor({ state: "visible", timeout: 20000 })
        .then(() => true)
        .catch(() => false);
      const body = await page.locator("body").innerText();
      const errorBanner = await page.locator('[class*="rose"], [class*="error"], [role="alert"]').first().innerText().catch(() => "");
      step1Detail.errorBanner = errorBanner || null;
      const redirectedToDashboard = /\/dashboard/.test(page.url());
      const signupOk = signupSuccessVisible || redirectedToDashboard || /confirm|sent|success|επιβεβαιώ/i.test(body);

      const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = userList?.users?.find((u) => u.email?.toLowerCase() === landlordEmail.toLowerCase())?.id ?? null;

      step1Detail = { landlordEmail, userId, signupSuccessVisible, redirectedToDashboard, url: page.url() };
      const rateLimited = /rate limit exceeded/i.test(body) || /rate limit exceeded/i.test(errorBanner);
      step1Detail.rateLimited = rateLimited;
      step1Status = signupOk && userId ? "PASS" : "FAIL";
      if (step1Status === "FAIL") {
        step1Error = rateLimited
          ? "Supabase auth email rate limit exceeded — signup blocked after repeated test runs"
          : signupOk
            ? "User record not found in Supabase auth"
            : errorBanner || "Signup form did not show success state";
      }

      if (!userId && rateLimited) {
        const created = await admin.auth.admin.createUser({
          email: landlordEmail,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: LANDLORD.fullName, company_name: LANDLORD.company },
        });
        if (!created.error && created.data.user) {
          userId = created.data.user.id;
          report.setup.landlordCreatedViaAdmin = true;
          step1Detail.adminCreateUserFallback = userId;
        }
      }
    } catch (error) {
      step1Error = error instanceof Error ? error.message : String(error);
      if (!step1Shot) step1Shot = await shot(page, outDir, "01-landlord-signup-error.png").catch(() => null);
    }
    report.steps.push(auditStep(1, "Landlord signup", step1Status, step1Shot, step1Error, step1Detail));

    // ── 2. Email confirmation ────────────────────────────────────────────
    let step2Status = "FAIL";
    let step2Error = null;
    let step2Detail = {};
    let step2Shot = null;
    try {
      let confirmLink = null;
      if (!/\/dashboard/.test(page.url())) {
        const confirmMsgs = await pollMailinator(landlordInbox, 120000);
        step2Detail.mailinatorMessages = confirmMsgs.length;
        if (confirmMsgs.length > 0) {
          const full = await fetchMailinatorMessage(landlordInbox, confirmMsgs[0].id);
          const body = full?.parts?.map((p) => p.body ?? "").join("\n") ?? full?.body ?? full?.text ?? "";
          step2Detail.emailSubject = full?.subject ?? null;
          step2Detail.emailBodyLength = body.length;
          confirmLink = extractConfirmLink(body);
          step2Detail.confirmLinkFound = Boolean(confirmLink);
          if (!confirmLink && body.length > 0) {
            step2Detail.emailBodySnippet = body.slice(0, 500);
          }
        } else {
          step2Error = "No confirmation email received in Mailinator within 120s";
        }

        if (confirmLink) {
          await page.goto(confirmLink, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.waitForURL(/\/dashboard|\/auth\/callback/, { timeout: 45000 }).catch(() => undefined);
          await page.waitForTimeout(3000);
          if (/\/auth\/callback/.test(page.url())) {
            const hashParams = new URLSearchParams(page.url().split("#")[1] ?? "");
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            if (accessToken && refreshToken) {
              await establishSession(page, accessToken, refreshToken);
            }
            await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => undefined);
          }
        } else if (userId && confirmMsgs.length > 0) {
          step2Detail.note = "Email received but confirmation URL could not be parsed from body";
        } else if (userId) {
          step2Detail.note = "Mailinator empty — using admin generateLink to simulate confirmation click";
          const link = await admin.auth.admin.generateLink({
            type: "signup",
            email: landlordEmail,
            password: PASSWORD,
            options: {
              redirectTo: `${APP_URL}/auth/callback?next=/dashboard&email=${encodeURIComponent(landlordEmail)}`,
            },
          });
          if (link.error) {
            step2Detail.generateLinkError = link.error.message;
          } else {
            const verifyRes = await fetch(link.data.properties.action_link, { redirect: "manual" });
            confirmLink = verifyRes.headers.get("location");
            step2Detail.confirmLinkSource = "admin_generateLink";
            step2Detail.confirmLinkFound = Boolean(confirmLink);
            if (confirmLink) {
              await page.goto(confirmLink, { waitUntil: "domcontentloaded", timeout: 60000 });
              await page.waitForURL(/\/dashboard|\/auth\/callback/, { timeout: 45000 }).catch(() => undefined);
              await page.waitForTimeout(3000);
              if (/\/auth\/callback/.test(page.url())) {
                await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => undefined);
              }
            }
          }
        }
      }

      step2Shot = await shot(page, outDir, "02-email-confirmation.png");
      const confirmed =
        /\/dashboard/.test(page.url()) ||
        (await page.getByTestId("auth-callback-continue").isVisible().catch(() => false));
      const h1 = await page.locator("h1").first().innerText().catch(() => "");
      step2Detail = { ...step2Detail, url: page.url(), h1 };
      step2Status = /\/dashboard/.test(page.url()) && step2Detail.confirmLinkSource !== "admin_generateLink" ? "PASS" : "FAIL";
      if (/\/dashboard/.test(page.url()) && step2Detail.confirmLinkSource === "admin_generateLink") {
        step2Error =
          "Mailinator did not deliver/parse signup email; confirmation redirect verified via admin generateLink fallback only";
      } else if (step2Status === "FAIL" && !step2Error) {
        step2Error = `Confirmation did not reach dashboard. Final URL: ${page.url()}`;
      }
    } catch (error) {
      step2Error = error instanceof Error ? error.message : String(error);
      step2Shot = await shot(page, outDir, "02-email-confirmation-error.png").catch(() => null);
    }
    report.steps.push(auditStep(2, "Email confirmation", step2Status, step2Shot, step2Error, step2Detail));

    // ── 3. Dashboard access ──────────────────────────────────────────────
    let step3Status = "FAIL";
    let step3Error = null;
    let step3Detail = {};
    let step3Shot = null;
    try {
      if (!/\/dashboard/.test(page.url())) {
        await page.goto(`${APP_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
      }
      if (!/\/dashboard/.test(page.url()) && userId) {
        const link = await admin.auth.admin.generateLink({
          type: "signup",
          email: landlordEmail,
          password: PASSWORD,
          options: { redirectTo: `${APP_URL}/auth/callback?next=/dashboard&email=${encodeURIComponent(landlordEmail)}` },
        });
        if (link.data?.properties?.action_link) {
          const verifyRes = await fetch(link.data.properties.action_link, { redirect: "manual" });
          const location = verifyRes.headers.get("location");
          if (location?.includes("access_token=")) {
            await page.goto(location, { waitUntil: "domcontentloaded", timeout: 60000 });
            await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => undefined);
            step3Detail.confirmationFallback = "admin_generateLink_hash_redirect";
          }
        }
      }
      if (!/\/dashboard/.test(page.url()) && userId) {
        await admin.auth.admin.updateUserById(userId, { email_confirm: true });
        const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: signInData } = await anon.auth.signInWithPassword({ email: landlordEmail, password: PASSWORD });
        if (signInData?.session) {
          await establishSession(page, signInData.session.access_token, signInData.session.refresh_token);
          await page.goto(`${APP_URL}/dashboard`, { waitUntil: "domcontentloaded" });
          step3Detail.sessionFallback = "admin_signInWithPassword";
        } else {
          await signInLandlord(page, landlordEmail, PASSWORD);
          step3Detail.sessionFallback = "ui_sign_in";
        }
      }

      if (userId) {
        await admin.from("users").upsert(
          { id: userId, email: landlordEmail, full_name: LANDLORD.fullName, role: "landlord" },
          { onConflict: "id" },
        );
        await seedSubscription(admin, userId, landlordEmail);
        report.setup.billingSeeded = true;
        await page.reload({ waitUntil: "domcontentloaded" });
      }

      step3Shot = await shot(page, outDir, "03-dashboard-access.png");
      const dashBody = await page.locator("body").innerText();
      step3Detail = { ...step3Detail, url: page.url(), hasWelcome: /welcome|καλώς/i.test(dashBody) };
      step3Status = /\/dashboard/.test(page.url()) ? "PASS" : "FAIL";
      if (step3Status === "FAIL") {
        step3Error = `Could not access dashboard. URL: ${page.url()}`;
      } else if (step3Detail.confirmationFallback || step3Detail.sessionFallback) {
        step3Detail.note = "Dashboard reached after supplementary session bootstrap";
      }
    } catch (error) {
      step3Error = error instanceof Error ? error.message : String(error);
      step3Shot = await shot(page, outDir, "03-dashboard-access-error.png").catch(() => null);
    }
    report.steps.push(auditStep(3, "Dashboard access", step3Status, step3Shot, step3Error, step3Detail));

    // ── 4. Create tenant check ───────────────────────────────────────────
    let step4Status = "FAIL";
    let step4Error = null;
    let step4Detail = {};
    let step4Shot = null;
    try {
      await page.getByTestId("dashboard-welcome-cta").click({ timeout: 15000 });
      const dialog = page.getByRole("dialog");
      await dialog.locator("#property_name").fill(PROPERTY.name);
      await dialog.locator("#monthly_rent").fill(PROPERTY.rent);
      await dialog.locator("#address_line1").fill(PROPERTY.address);
      await dialog.locator("#city").fill(PROPERTY.city);
      await dialog.locator("#postal_code").fill(PROPERTY.postal);
      await dialog.getByRole("button", { name: /Continue|Συνέχεια/i }).first().click();
      await dialog.locator("#tenant_full_name").fill(TENANT.fullName);
      await dialog.locator("#tenant_email").fill(tenantEmail);
      await dialog.getByRole("button", { name: /Continue|Συνέχεια/i }).first().click();
      await dialog.getByRole("button", { name: /Continue|Συνέχεια/i }).first().click();
      await dialog.getByRole("button", { name: /Continue|Συνέχεια/i }).first().click();
      await dialog.getByRole("button", { name: /Create|Start Tenant Check|Δημιουργία/i }).last().click({ timeout: 15000 });
      await page.waitForURL(/\/dashboard\/checks\//, { timeout: 45000 });
      checkId = page.url().split("/checks/")[1]?.split(/[?#]/)[0] ?? null;
      step4Shot = await shot(page, outDir, "04-tenant-check-created.png");
      step4Detail = { checkId, tenantEmail, url: page.url() };
      step4Status = checkId ? "PASS" : "FAIL";
      if (!checkId) step4Error = "Tenant check wizard did not navigate to check detail page";
    } catch (error) {
      step4Error = error instanceof Error ? error.message : String(error);
      step4Shot = await shot(page, outDir, "04-tenant-check-error.png").catch(() => null);
      if (userId) {
        step4Detail.fallback = "admin_insert";
        const token = crypto.randomBytes(24).toString("base64url");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const { data: property, error: propertyError } = await admin
          .from("properties")
          .insert({
            landlord_id: userId,
            name: PROPERTY.name,
            address_line1: PROPERTY.address,
            city: PROPERTY.city,
            postal_code: PROPERTY.postal,
            monthly_rent: Number(PROPERTY.rent),
          })
          .select("id")
          .single();
        if (!propertyError && property) {
          const uploadUrl = `${APP_URL}/upload/${token}`;
          const { data: checkRow, error: checkError } = await admin
            .from("tenant_checks")
            .insert({
              landlord_id: userId,
              property_id: property.id,
              tenant_full_name: TENANT.fullName,
              tenant_email: tenantEmail,
              requested_documents: ["passport", "payslips", "bank_statements"],
              status: "pending_upload",
              upload_token_hash: tokenHash,
              upload_token_expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
              secure_upload_url: uploadUrl,
            })
            .select("id")
            .single();
          if (!checkError && checkRow) {
            checkId = checkRow.id;
            uploadToken = token;
            step4Detail.checkId = checkId;
            step4Detail.fallbackSuccess = true;
            await page.goto(`${APP_URL}/dashboard/checks/${checkId}`, { waitUntil: "domcontentloaded" });
            step4Shot = await shot(page, outDir, "04-tenant-check-admin-fallback.png");
          } else {
            step4Detail.checkError = checkError?.message ?? null;
          }
        } else {
          step4Detail.propertyError = propertyError?.message ?? null;
        }
      }
    }
    if (checkId && step4Status === "FAIL" && step4Detail.fallbackSuccess) {
      step4Error = `${step4Error ?? "UI wizard failed"}; admin fallback created check ${checkId} for downstream audit only`;
    }
    report.steps.push(auditStep(4, "Create tenant check", step4Status, step4Shot, step4Error, step4Detail));

    if (!checkId) {
      report.steps.push(
        auditStep(5, "Generate tenant invitation link", "FAIL", step4Shot, "Skipped — no tenant check created", {}),
      );
      report.steps.push(
        auditStep(6, "Tenant upload flow", "FAIL", null, "Skipped — no tenant check created", {}),
      );
      report.steps.push(
        auditStep(7, "Document storage in Supabase", "FAIL", null, "Skipped — no tenant check created", {}),
      );
      report.steps.push(
        auditStep(8, "AI report generation", "FAIL", null, "Skipped — no tenant check created", {}),
      );
      report.steps.push(
        auditStep(9, "Report display in landlord dashboard", "FAIL", null, "Skipped — no tenant check created", {}),
      );
      throw new Error("Cannot continue without tenant check ID");
    }

    // ── 5. Generate tenant invitation link ───────────────────────────────
    let step5Status = "FAIL";
    let step5Error = null;
    let step5Detail = {};
    let step5Shot = null;
    try {
      await page.goto(`${APP_URL}/dashboard/checks/${checkId}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      const sendByEmail = page.getByRole("button", { name: /Send by email|Αποστολή με email/i }).first();
      const sendUploadLink = page.getByRole("button", { name: /Send upload link|Activate|Αποστολή συνδέσμου|Resend/i }).first();

      if (await sendByEmail.isVisible().catch(() => false)) {
        await sendByEmail.click();
      } else if (await sendUploadLink.isVisible().catch(() => false)) {
        await sendUploadLink.click();
      } else {
        step5Error = "No invitation send button visible on check page";
      }

      await page.waitForTimeout(8000);
      step5Shot = await shot(page, outDir, "05-invitation-link.png");

      const { data: checkRow, error: checkErr } = await admin
        .from("tenant_checks")
        .select("secure_upload_url, workflow_activated_at, status, upload_token_hash")
        .eq("id", checkId)
        .maybeSingle();

      uploadToken = checkRow?.secure_upload_url?.split("/upload/")[1] ?? null;
      const pageBody = await page.locator("body").innerText();
      const hasSchemaError = /does not exist|workflow_activated_at|could not activate/i.test(pageBody);

      step5Detail = {
        secureUploadUrl: checkRow?.secure_upload_url ?? null,
        workflowActivatedAt: checkRow?.workflow_activated_at ?? null,
        status: checkRow?.status ?? null,
        uploadTokenPresent: Boolean(uploadToken),
        checkErr: checkErr?.message ?? null,
        hasSchemaError,
      };

      step5Status =
        uploadToken && checkRow?.workflow_activated_at && !hasSchemaError ? "PASS" : "FAIL";
      if (step5Status === "FAIL") {
        step5Error = hasSchemaError
          ? "Database schema missing workflow_activated_at column or activation failed"
          : uploadToken
            ? "Upload URL present but workflow_activated_at not set"
            : "Upload token / secure_upload_url not generated";
      }
    } catch (error) {
      step5Error = error instanceof Error ? error.message : String(error);
      step5Shot = await shot(page, outDir, "05-invitation-link-error.png").catch(() => null);
    }
    report.steps.push(auditStep(5, "Generate tenant invitation link", step5Status, step5Shot, step5Error, step5Detail));

    // ── 6. Tenant upload flow ──────────────────────────────────────────────
    let step6Status = "FAIL";
    let step6Error = null;
    let step6Detail = {};
    let step6Shot = null;
    const uploadPage = await context.newPage();
    try {
      if (!uploadToken) {
        step6Error = "Missing upload token from step 5";
      } else {
        await uploadPage.goto(`${APP_URL}/upload/${uploadToken}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await uploadPage.waitForTimeout(2000);

        const passportPdf = path.join(os.tmpdir(), `audit-passport-${runId}.pdf`);
        const payslipPdf = path.join(os.tmpdir(), `audit-payslip-${runId}.pdf`);
        createRichPdf(passportPdf, [
          "GREEK PASSPORT",
          `Name: ${TENANT.fullName}`,
          "Passport No: AK9991234",
          "Nationality: Greek",
        ]);
        createRichPdf(payslipPdf, [
          "PAYSLIP",
          `Employee: ${TENANT.fullName}`,
          "Monthly Gross: EUR 3,800",
          "Net Pay: EUR 2,900",
        ]);

        await fillTenantUploadForm(uploadPage, tenantEmail, "passport", passportPdf);
        await uploadPage.waitForTimeout(12000);
        await uploadPage.goto(`${APP_URL}/upload/${uploadToken}`, { waitUntil: "domcontentloaded" });
        await uploadPage.waitForTimeout(1500);
        await fillTenantUploadForm(uploadPage, tenantEmail, "payslips", payslipPdf);
        await uploadPage.waitForTimeout(20000);

        fs.unlinkSync(passportPdf);
        fs.unlinkSync(payslipPdf);

        step6Shot = await shot(uploadPage, outDir, "06-tenant-upload.png");
        const uploadBody = await uploadPage.locator("body").innerText();
        const uploadOk =
          /report is ready|success|uploaded|received|υποβλήθηκαν|ελήφθησαν|SafeKey Report/i.test(uploadBody);
        step6Detail = { uploadUrl: `${APP_URL}/upload/${uploadToken}`, uploadOk, bodySnippet: uploadBody.slice(0, 300) };
        step6Status = uploadOk ? "PASS" : "FAIL";
        if (!uploadOk) step6Error = "Upload form did not show success / report-ready state";
      }
    } catch (error) {
      step6Error = error instanceof Error ? error.message : String(error);
      step6Shot = await shot(uploadPage, outDir, "06-tenant-upload-error.png").catch(() => null);
    } finally {
      await uploadPage.close().catch(() => undefined);
    }
    report.steps.push(auditStep(6, "Tenant upload flow", step6Status, step6Shot, step6Error, step6Detail));

    // ── 7. Document storage in Supabase ────────────────────────────────────
    let step7Status = "FAIL";
    let step7Error = null;
    let step7Detail = {};
    let step7Shot = step6Shot;
    try {
      const { data: docs, error: docsErr } = await admin
        .from("tenant_documents")
        .select("id, document_type, storage_path, file_name, extracted_text")
        .eq("tenant_check_id", checkId);

      const storageResults = [];
      for (const doc of docs ?? []) {
        if (!doc.storage_path) continue;
        const { data: blob, error: dlErr } = await admin.storage.from("tenant-documents").download(doc.storage_path);
        storageResults.push({
          id: doc.id,
          type: doc.document_type,
          storage_path: doc.storage_path,
          bytes: blob ? (await blob.arrayBuffer()).byteLength : 0,
          downloadError: dlErr?.message ?? null,
          hasExtractedText: Boolean(doc.extracted_text && doc.extracted_text.length > 10),
        });
      }

      step7Detail = {
        documentCount: docs?.length ?? 0,
        storageVerified: storageResults.filter((r) => r.bytes > 0).length,
        docsErr: docsErr?.message ?? null,
        storageResults,
      };
      step7Status =
        storageResults.length >= 1 && storageResults.every((r) => r.bytes > 0) ? "PASS" : "FAIL";
      if (step7Status === "FAIL") {
        step7Error =
          docsErr?.message ??
          (docs?.length ? "Documents in DB but storage download failed or empty" : "No tenant_documents rows found");
      }
    } catch (error) {
      step7Error = error instanceof Error ? error.message : String(error);
    }
    report.steps.push(auditStep(7, "Document storage in Supabase", step7Status, step7Shot, step7Error, step7Detail));

    // ── 8. AI report generation ────────────────────────────────────────────
    let step8Status = "FAIL";
    let step8Error = null;
    let step8Detail = {};
    let step8Shot = null;
    try {
      let aiReport = await pollAiReport(admin, checkId, 180000);

      if (!aiReport?.score && aiReport?.recommendation == null) {
        await page.goto(`${APP_URL}/dashboard/checks/${checkId}`, { waitUntil: "domcontentloaded" });
        const regenBtn = page.getByRole("button", { name: /Regenerate|Αναδημιουργία|Generate/i }).first();
        if (await regenBtn.isVisible().catch(() => false)) {
          await regenBtn.click();
          await page.waitForTimeout(15000);
          aiReport = await pollAiReport(admin, checkId, 60000);
        }
      }

      const { data: checkStatus } = await admin.from("tenant_checks").select("status").eq("id", checkId).maybeSingle();
      step8Detail = {
        score: aiReport?.score ?? null,
        recommendation: aiReport?.recommendation ?? null,
        riskLevel: aiReport?.reasoning?.riskLevel ?? null,
        redFlags: aiReport?.red_flags ?? [],
        missingDocuments: aiReport?.missing_documents ?? [],
        generatedBy: aiReport?.generated_by ?? null,
        checkStatus: checkStatus?.status ?? null,
        pdfStoragePath: aiReport?.pdf_storage_path ?? null,
      };
      step8Status = aiReport?.score != null && aiReport?.recommendation ? "PASS" : "FAIL";
      if (step8Status === "FAIL") step8Error = "AI report not generated within timeout or missing score/recommendation";
    } catch (error) {
      step8Error = error instanceof Error ? error.message : String(error);
    }
    report.steps.push(auditStep(8, "AI report generation", step8Status, step8Shot, step8Error, step8Detail));

    // ── 9. Report display in landlord dashboard ────────────────────────────
    let step9Status = "FAIL";
    let step9Error = null;
    let step9Detail = {};
    let step9Shot = null;
    try {
      await page.goto(`${APP_URL}/dashboard/checks/${checkId}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(3000);
      step9Shot = await shot(page, outDir, "09-dashboard-report.png");

      const dashBody = await page.locator("body").innerText();
      const score = report.steps.find((s) => s.step === 8)?.detail?.score;
      const hasScoreUi = /SafeKey Score|\/100|Score/i.test(dashBody);
      const hasRecommendation = /Recommendation|Approve|Reject|Conditional|Σύσταση/i.test(dashBody);
      const scoreVisible = score != null ? dashBody.includes(String(score)) : hasScoreUi;

      step9Detail = {
        url: page.url(),
        hasScoreUi,
        hasRecommendation,
        scoreVisible,
        expectedScore: score ?? null,
        bodySnippet: dashBody.slice(0, 400),
      };
      step9Status = hasScoreUi && hasRecommendation && scoreVisible ? "PASS" : "FAIL";
      if (step9Status === "FAIL") {
        step9Error = "Dashboard check page does not display AI report score/recommendation";
      }
    } catch (error) {
      step9Error = error instanceof Error ? error.message : String(error);
      step9Shot = await shot(page, outDir, "09-dashboard-report-error.png").catch(() => null);
    }
    report.steps.push(auditStep(9, "Report display in landlord dashboard", step9Status, step9Shot, step9Error, step9Detail));
  } catch (fatal) {
    report.fatalError = fatal instanceof Error ? fatal.message : String(fatal);
    await shot(page, outDir, "fatal-error.png").catch(() => undefined);
  } finally {
    await browser.close();
  }

  report.completedAt = new Date().toISOString();
  report.summary = {
    pass: report.steps.filter((s) => s.status === "PASS").length,
    partial: report.steps.filter((s) => s.status === "PARTIAL").length,
    fail: report.steps.filter((s) => s.status === "FAIL").length,
    total: report.steps.length,
    verdict: report.steps.some((s) => s.status === "FAIL") || report.fatalError ? "FAIL" : "PASS",
  };
  report.artifacts = { checkId, landlordEmail, tenantEmail, userId };

  fs.writeFileSync(path.join(outDir, "audit-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.summary.fail || report.fatalError ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
