/**
 * Production readiness verifier (no secrets printed).
 * Usage: node scripts/verify-production-ready.cjs --url https://getsafekey.app
 */
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf("--url");
  const appUrl =
    (urlIndex >= 0 ? args[urlIndex + 1] : null) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://getsafekey.app";

  return { appUrl: appUrl.replace(/\/$/, "") };
}

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return env;
}

function checkLocalEnv(env) {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_BASIC_PRICE_ID",
    "STRIPE_PRO_PRICE_ID",
    "STRIPE_PREMIUM_PRICE_ID",
  ];

  const screening =
    env.STRIPE_SCREENING_PRICE_ID || env.STRIPE_SCREENING_ID ? [] : ["STRIPE_SCREENING_PRICE_ID"];

  const missing = [...required, ...screening].filter((key) => !env[key]);

  return {
    ok: missing.length === 0,
    missing,
    warnings: [
      !env.STRIPE_WEBHOOK_SECRET ? "STRIPE_WEBHOOK_SECRET missing (checkout works; sync incomplete)" : null,
      !env.RESEND_API_KEY ? "RESEND_API_KEY missing (tenant invite emails manual)" : null,
      !env.ADMIN_EMAILS ? "ADMIN_EMAILS missing (no configured analyst access)" : null,
    ].filter(Boolean),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`${url} HTTP ${response.status}: ${text}`);
  }

  return json;
}

async function main() {
  const { appUrl } = parseArgs();
  const localEnv = readEnvFile();
  const local = checkLocalEnv(localEnv);
  const failures = [];
  const warnings = [...local.warnings];

  console.log(`\nSafeKey production readiness — ${appUrl}\n`);

  if (!local.ok) {
    failures.push(`Local .env.local missing: ${local.missing.join(", ")}`);
  } else {
    console.log("✓ Local env has core Supabase + Stripe checkout keys");
  }

  for (const warning of local.warnings) {
    console.log(`⚠ ${warning}`);
  }

  try {
    const stripe = await fetchJson(`${appUrl}/api/health/stripe`);
    if (!stripe.checkoutReady) {
      failures.push(`Stripe checkout not ready: missing ${(stripe.missingCheckoutKeys || []).join(", ")}`);
    } else {
      console.log("✓ Production Stripe checkout health");
    }
    if (!stripe.hasWebhookSecret) {
      warnings.push("Production STRIPE_WEBHOOK_SECRET not configured");
    }
  } catch (error) {
    failures.push(`Stripe health check failed: ${error.message}`);
  }

  try {
    const production = await fetchJson(`${appUrl}/api/health/production`);
    if (!production.uploadsReady) {
      failures.push("Production uploads not ready (SUPABASE_SERVICE_ROLE_KEY)");
    } else {
      console.log("✓ Production uploads health");
    }
    if (!production.emailReady) {
      warnings.push("Production email delivery not configured");
    } else {
      console.log("✓ Production email delivery configured");
    }
  } catch (error) {
    failures.push(`Production health check failed: ${error.message}`);
  }

  const publicRoutes = ["/", "/login", "/login/forgot-password", "/privacy", "/terms", "/api/health/production"];
  for (const route of publicRoutes) {
    try {
      const response = await fetch(`${appUrl}${route}`, { redirect: "follow" });
      if (response.status >= 500) {
        failures.push(`${route} returned HTTP ${response.status}`);
      }
    } catch (error) {
      failures.push(`${route} unreachable: ${error.message}`);
    }
  }
  console.log("✓ Public routes reachable");

  const billingSchemaScript = path.join(process.cwd(), "scripts", "verify-billing-schema.cjs");
  if (fs.existsSync(billingSchemaScript) && localEnv.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      require("child_process").execSync("node scripts/verify-billing-schema.cjs", {
        stdio: "inherit",
        env: { ...process.env, ...localEnv },
      });
      console.log("✓ Billing schema verification");
    } catch {
      failures.push("Billing schema verification failed (run migrations on Supabase)");
    }
  }

  console.log("\n--- Summary ---\n");
  for (const warning of warnings) {
    console.log(`⚠ ${warning}`);
  }

  if (failures.length > 0) {
    console.error("FAILED:\n" + failures.map((item) => `  • ${item}`).join("\n"));
    process.exit(1);
  }

  console.log("PASSED: production readiness checks (see docs/production-e2e-qa.md for manual E2E).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
