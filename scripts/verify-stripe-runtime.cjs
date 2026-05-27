/**
 * Full Stripe runtime verification: key mode, price IDs, checkout session creation.
 * Usage: node scripts/verify-stripe-runtime.cjs [.env file path]
 */
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");

function loadEnv(filePath) {
  const env = { ...process.env };
  if (!fs.existsSync(filePath)) {
    return env;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function keyMode(secret) {
  const trimmed = (secret || "").trim();
  if (trimmed.startsWith("sk_live_")) return "live";
  if (trimmed.startsWith("sk_test_")) return "test";
  return "invalid";
}

function priceMode(price) {
  return price.livemode ? "live" : "test";
}

async function main() {
  const envFile = process.argv[2] || path.join(process.cwd(), ".env.vercel.production");
  const env = loadEnv(envFile);
  const secret = (env.STRIPE_SECRET_KEY || "").trim();
  const screening =
    (env.STRIPE_SCREENING_PRICE_ID || env.STRIPE_SCREENING_ID || "").trim();
  const priceIds = {
    basic: (env.STRIPE_BASIC_PRICE_ID || "").trim(),
    pro: (env.STRIPE_PRO_PRICE_ID || "").trim(),
    premium: (env.STRIPE_PREMIUM_PRICE_ID || "").trim(),
    screening,
  };

  console.log("\n=== SafeKey Stripe runtime verification ===\n");
  console.log("Env file:", envFile);

  const mode = keyMode(secret);
  if (!secret) {
    console.error("FAIL: STRIPE_SECRET_KEY missing");
    process.exit(1);
  }

  if (mode === "invalid") {
    console.error("FAIL: malformed STRIPE_SECRET_KEY (expected sk_live_ or sk_test_)");
    console.error("Prefix:", secret.slice(0, 12));
    process.exit(1);
  }

  console.log("Secret key mode:", mode, `(len ${secret.length})`);

  for (const [name, id] of Object.entries(priceIds)) {
    if (!id) {
      console.error(`FAIL: missing price id for ${name}`);
      process.exit(1);
    }
    if (!id.startsWith("price_")) {
      console.warn(`WARN: ${name} id does not start with price_: ${id}`);
    }
  }

  const stripe = new Stripe(secret, {
    apiVersion: "2026-04-22.dahlia",
    maxNetworkRetries: 1,
    timeout: 30_000,
  });

  const failures = [];

  for (const [plan, priceId] of Object.entries(priceIds)) {
    if (plan === "screening") continue;

    try {
      const price = await stripe.prices.retrieve(priceId);
      const pm = priceMode(price);
      console.log(`Price ${plan}:`, priceId, "→", pm, price.active ? "active" : "INACTIVE");

      if (pm !== mode) {
        failures.push(`${plan}: key is ${mode} but price is ${pm} (${priceId})`);
      }
      if (!price.active) {
        failures.push(`${plan}: price is not active (${priceId})`);
      }
    } catch (error) {
      failures.push(`${plan}: retrieve failed — ${error.message}`);
      console.error(`  Stripe error type:`, error.type, "code:", error.code);
    }
  }

  try {
    const screeningPrice = await stripe.prices.retrieve(priceIds.screening);
    const pm = priceMode(screeningPrice);
    console.log("Price screening:", priceIds.screening, "→", pm);
    if (pm !== mode) {
      failures.push(`screening: key is ${mode} but price is ${pm}`);
    }
  } catch (error) {
    failures.push(`screening: ${error.message}`);
  }

  console.log("\n--- Creating test checkout session (pro plan) ---\n");

  try {
    const customer = await stripe.customers.create({
      email: `stripe.verify.${Date.now()}@safekey.local`,
      metadata: { source: "verify-stripe-runtime" },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceIds.pro, quantity: 1 }],
      success_url: "https://getsafekey.app/dashboard/billing?checkout=success",
      cancel_url: "https://getsafekey.app/dashboard/billing?checkout=cancelled",
    });

    if (!session.url) {
      failures.push("checkout session created but url is empty");
    } else {
      console.log("SUCCESS: checkout session", session.id);
      console.log("Redirect URL:", session.url.slice(0, 80) + "...");
    }

    await stripe.customers.del(customer.id).catch(() => {});
  } catch (error) {
    failures.push(`checkout session: ${error.message}`);
    console.error("  type:", error.type, "code:", error.code, "status:", error.statusCode);
    if (error.raw) {
      console.error("  raw:", JSON.stringify(error.raw, null, 2).slice(0, 500));
    }
  }

  console.log("\n=== Summary ===\n");

  if (failures.length > 0) {
    failures.forEach((item) => console.error("•", item));
    process.exit(1);
  }

  console.log("All Stripe runtime checks passed.");
}

main().catch((error) => {
  console.error("Unexpected:", error);
  process.exit(1);
});
