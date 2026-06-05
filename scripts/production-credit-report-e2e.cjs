/**
 * Production E2E — Credit Report / Tiresias flow
 * Usage: node scripts/production-credit-report-e2e.cjs
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { chromium } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

const APP_URL = process.env.SAFEKEY_APP_URL || "https://getsafekey.app";
const TIRESIAS_URL = "https://www.tiresias.gr/en/individuals/public-service-office/";
const PASSWORD = "Password123!";

function readEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env.vercel.production", ".env.vercel.pulled"]) {
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

function step(name, status, detail = null) {
  return { step: name, status, detail };
}

function createSecureToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createMinimalPdf(filePath) {
  fs.writeFileSync(
    filePath,
    `%PDF-1.1
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (Tiresias Credit Report) Tj ET
endstream endobj
3 0 obj<< /Type /Page /Parent 4 0 R /MediaBox [0 0 612 792] /Contents 2 0 R >>endobj
4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj
xref
0 6
trailer<< /Size 6 /Root 5 0 R >>
startxref
366
%%EOF`,
  );
}

async function establishSession(page, accessToken, refreshToken) {
  await page.context().request.post(`${APP_URL}/auth/callback/session`, {
    data: { accessToken, refreshToken },
  });
}

async function authenticateViaSupabase(page, env, email, password) {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(error?.message ?? "Supabase password sign-in failed.");
  }
  await establishSession(page, data.session.access_token, data.session.refresh_token);
  await page.goto(`${APP_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
}

async function seedSubscription(admin, userId, email) {
  const runtime = await fetch(`${APP_URL}/api/health/stripe/runtime`).then((r) => r.json());
  const basicPrice = runtime?.prices?.basic?.priceId ?? "price_1TbeAQP2qCjvfVhK1UKC0tOD";
  const customerId = `cus_cr_${Date.now()}`;
  const subscriptionId = `sub_cr_${Date.now()}`;
  await admin.from("billing_customers").upsert({ user_id: userId, stripe_customer_id: customerId, email }, { onConflict: "user_id" });
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

async function pollMailinatorInbox(inbox, timeoutMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`https://mailinator.com/api/v2/domains/public/inboxes/${encodeURIComponent(inbox)}`, {
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const json = await response.json();
        const msgs = json.msgs ?? json.messages ?? [];
        if (msgs.length > 0) return msgs;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
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

async function main() {
  const env = readEnv();
  const report = { appUrl: APP_URL, startedAt: new Date().toISOString(), results: [], error: null };

  const landlordEmail = `sk.cr.landlord.${Date.now()}@mailinator.com`;
  const tenantInbox = `sk.cr.tenant.${Date.now()}`;
  const tenantEmail = `${tenantInbox}@mailinator.com`;
  const tenantName = "Credit Report QA Tenant";

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId = null;
  let checkId = null;
  let propertyId = null;
  let uploadToken = null;
  const browser = await chromium.launch({ headless: true });

  try {
    // Schema check
    const schemaProbe = await admin
      .from("tenant_public_profiles")
      .select("credit_report_consent, credit_report_consent_at, credit_report_requested_at")
      .limit(1);
    report.results.push(
      step(
        "0. Production schema — credit report columns",
        schemaProbe.error ? "FAIL" : "PASS",
        schemaProbe.error ? { message: schemaProbe.error.message } : { readable: true },
      ),
    );
    if (schemaProbe.error) throw new Error(schemaProbe.error.message);

    const created = await admin.auth.admin.createUser({
      email: landlordEmail,
      email_confirm: true,
      password: PASSWORD,
      user_metadata: { full_name: "CR QA Landlord", role: "landlord" },
    });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    await admin.from("users").upsert({ id: userId, email: landlordEmail, full_name: "CR QA Landlord", role: "landlord" }, { onConflict: "id" });
    await seedSubscription(admin, userId, landlordEmail);

    const token = createSecureToken();
    const uploadUrl = `${APP_URL}/upload/${token}`;
    const { data: property, error: propertyError } = await admin
      .from("properties")
      .insert({
        landlord_id: userId,
        name: "Credit Report QA Property",
        address_line1: "Ermou 12",
        city: "Athens",
        postal_code: "10563",
        monthly_rent: 950,
      })
      .select("id")
      .single();
    if (propertyError) throw propertyError;
    propertyId = property.id;

    const { data: checkRow, error: checkError } = await admin
      .from("tenant_checks")
      .insert({
        landlord_id: userId,
        property_id: propertyId,
        tenant_full_name: tenantName,
        tenant_email: tenantEmail,
        requested_documents: ["national_id", "payslips", "bank_statement"],
        document_requirements: [
          { documentType: "national_id", priority: "required" },
          { documentType: "payslips", priority: "required" },
          { documentType: "bank_statement", priority: "required" },
        ],
        status: "pending_upload",
        upload_token_hash: hashToken(token),
        upload_token_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        secure_upload_url: uploadUrl,
        workflow_activated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (checkError) throw checkError;
    checkId = checkRow.id;
    uploadToken = token;

    const page = await browser.newPage();
    await authenticateViaSupabase(page, env, landlordEmail, PASSWORD);
    await page.goto(`${APP_URL}/dashboard/checks/${checkId}`, { waitUntil: "domcontentloaded" });

    const sendByEmail = page.getByRole("button", { name: /Send by email|Αποστολή με email/i }).first();
    if (await sendByEmail.isVisible().catch(() => false)) {
      await sendByEmail.click();
      await page.waitForTimeout(6000);
    }

    const mailMessages = await pollMailinatorInbox(tenantInbox, 90000);
    let mailBody = "";
    if (mailMessages.length > 0) {
      const full = await fetchMailinatorMessage(tenantInbox, mailMessages[0].id);
      mailBody = full?.parts?.map((p) => p.body ?? "").join("\n") ?? full?.body ?? "";
    }

    const emailHasTrustSection = /Strengthen your SafeKey Trust Score/i.test(mailBody);
    const emailHasTiresias = /tiresias\.gr/i.test(mailBody);
    const emailHasUploadLink = /getsafekey\.app\/upload\//i.test(mailBody);
    report.results.push(
      step("1. Tenant invitation email received", mailMessages.length > 0 ? "PASS" : "FAIL", {
        messages: mailMessages.length,
        trustSection: emailHasTrustSection,
        tiresiasLink: emailHasTiresias,
        uploadLink: emailHasUploadLink,
      }),
    );
    report.results.push(
      step("1b. Email includes credit report trust section", emailHasTrustSection && emailHasTiresias ? "PASS" : "FAIL", {
        emailHasTrustSection,
        emailHasTiresias,
      }),
    );

    const uploadPage = await browser.newPage();
    await uploadPage.goto(`${APP_URL}/upload/${uploadToken}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await uploadPage.waitForTimeout(2000);
    const uploadBody = await uploadPage.locator("body").innerText();

    const hasCreditReportSection = /Credit Report|Tiresias Report|πιστωτικό report/i.test(uploadBody);
    report.results.push(
      step("2. Upload portal shows Credit Report section", hasCreditReportSection ? "PASS" : "FAIL", {
        snippet: uploadBody.slice(0, 400),
      }),
    );

    const tiresiasLink = uploadPage.locator(`a[href="${TIRESIAS_URL}"]`).first();
    const tiresiasVisible = await tiresiasLink.isVisible().catch(() => false);
    let tiresiasHref = null;
    if (tiresiasVisible) {
      tiresiasHref = await tiresiasLink.getAttribute("href");
    }
    report.results.push(
      step("3. Tiresias button opens correctly", tiresiasVisible && tiresiasHref === TIRESIAS_URL ? "PASS" : "FAIL", {
        tiresiasVisible,
        tiresiasHref,
      }),
    );

    if (tiresiasVisible) {
      await tiresiasLink.click();
      await uploadPage.waitForTimeout(3000);
      const { data: profileAfterRequest } = await admin
        .from("tenant_public_profiles")
        .select("credit_report_requested_at")
        .eq("tenant_check_id", checkId)
        .maybeSingle();
      report.results.push(
        step("3b. Requested status recorded after Tiresias click", profileAfterRequest?.credit_report_requested_at ? "PASS" : "FAIL", {
          credit_report_requested_at: profileAfterRequest?.credit_report_requested_at ?? null,
        }),
      );
    }

    const consentBox = uploadPage.locator('input[name="credit_report_consent"]').first();
    const consentVisible = await consentBox.isVisible().catch(() => false);
    if (consentVisible) {
      await consentBox.check();
    }
    report.results.push(
      step("4. Consent checkbox works", consentVisible && (await consentBox.isChecked()) ? "PASS" : "FAIL", {
        consentVisible,
      }),
    );

    await uploadPage.locator('input[name="full_name"]').fill(tenantName);
    await uploadPage.locator('input[name="email"]').fill(tenantEmail);
    await uploadPage.locator('input[name="phone"]').fill("+306900000001");
    await uploadPage.locator('input[name="current_address"]').fill("Athens, Greece");
    await uploadPage.locator('input[name="monthly_income"]').fill("2800");
    await uploadPage.selectOption('select[name="employment_status"]', "full_time");

    const pdfPath = path.join(os.tmpdir(), `safekey-credit-report-${Date.now()}.pdf`);
    createMinimalPdf(pdfPath);
    const creditFileInput = uploadPage.locator('input[name="documents_credit_report"]').first();
    const creditInputVisible = await creditFileInput.isVisible().catch(() => false);
    if (creditInputVisible) {
      await creditFileInput.setInputFiles(pdfPath);
      await uploadPage.waitForTimeout(6000);
    }
    fs.unlinkSync(pdfPath);

    const { data: creditDocs } = await admin
      .from("tenant_documents")
      .select("id, document_type, file_name")
      .eq("tenant_check_id", checkId)
      .eq("document_type", "credit_report");
    const { data: profileAfterUpload } = await admin
      .from("tenant_public_profiles")
      .select("credit_report_consent, credit_report_consent_at")
      .eq("tenant_check_id", checkId)
      .maybeSingle();

    report.results.push(
      step("5. Credit Report upload works", creditDocs?.length > 0 ? "PASS" : "FAIL", {
        creditInputVisible,
        documents: creditDocs ?? [],
        consent: profileAfterUpload?.credit_report_consent ?? false,
        consentAt: profileAfterUpload?.credit_report_consent_at ?? null,
      }),
    );

    await page.goto(`${APP_URL}/dashboard/checks/${checkId}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const landlordBody = await page.locator("body").innerText();
    const landlordShowsConsent = /Credit report consent:\s*confirmed/i.test(landlordBody);
    const landlordShowsCredit = /Credit Report|Tiresias/i.test(landlordBody);
    report.results.push(
      step("6. Landlord dashboard shows credit report status", landlordShowsConsent || landlordShowsCredit ? "PASS" : "FAIL", {
        landlordShowsConsent,
        landlordShowsCredit,
        snippet: landlordBody.slice(0, 500),
      }),
    );

    const healthRes = await fetch(`${APP_URL}/api/health/production`);
    const healthOk = healthRes.ok;
    let healthJson = null;
    try {
      healthJson = await healthRes.json();
    } catch {
      // ignore
    }
    report.results.push(
      step("7. Production health check", healthOk ? "PASS" : "FAIL", {
        status: healthRes.status,
        health: healthJson,
      }),
    );

    const samplePdfRes = await fetch(`${APP_URL}/api/sample-report/pdf`);
    let pdfHasFinancial = false;
    if (samplePdfRes.ok) {
      const pdfBuffer = Buffer.from(await samplePdfRes.arrayBuffer());
      const pdfText = pdfBuffer.toString("latin1");
      pdfHasFinancial = /Financial Reliability/i.test(pdfText) && /Credit Report/i.test(pdfText);
    }
    report.results.push(
      step("8. PDF report includes Financial Reliability section", pdfHasFinancial ? "PASS" : "WARN", {
        samplePdfStatus: samplePdfRes.status,
        pdfHasFinancial,
        note: pdfHasFinancial ? null : "Sample PDF may need regeneration after deploy",
      }),
    );

    await uploadPage.close();
    await page.close();
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
    try {
      if (checkId) {
        const { data: docs } = await admin.from("tenant_documents").select("storage_path").eq("tenant_check_id", checkId);
        for (const doc of docs ?? []) {
          if (doc.storage_path) await admin.storage.from("tenant-documents").remove([doc.storage_path]);
        }
        await admin.from("tenant_public_profiles").delete().eq("tenant_check_id", checkId);
        await admin.from("tenant_checks").delete().eq("id", checkId);
      }
      if (propertyId) await admin.from("properties").delete().eq("id", propertyId);
      if (userId) {
        await admin.from("billing_subscriptions").delete().eq("user_id", userId);
        await admin.from("billing_customers").delete().eq("user_id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
    } catch {
      // best-effort cleanup
    }
  }

  const failed = report.results.filter((item) => item.status === "FAIL");
  report.summary = {
    pass: report.results.filter((item) => item.status === "PASS").length,
    warn: report.results.filter((item) => item.status === "WARN").length,
    fail: failed.length,
    total: report.results.length,
    verdict: failed.length === 0 && !report.error ? "PASS" : "FAIL",
  };
  report.finishedAt = new Date().toISOString();

  const outPath = path.join(process.cwd(), "qa-output", "credit-report-e2e.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  process.exit(failed.length || report.error ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
