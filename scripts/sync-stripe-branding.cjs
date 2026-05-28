/**
 * Sync Stripe account + product branding to ABE Studio.
 * Usage: node scripts/sync-stripe-branding.cjs [.env file]
 */
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");

const MERCHANT = process.env.STRIPE_MERCHANT_DISPLAY_NAME || "ABE Studio";
const DESCRIPTOR = (process.env.STRIPE_STATEMENT_DESCRIPTOR || "ABE STUDIO").slice(0, 22);
const LEGACY = [/peloponnese property hub/gi, /peloponnese/gi, /property hub/gi];

function loadEnv(filePath) {
  const env = { ...process.env };
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function normalizeName(name) {
  let next = name;
  for (const pattern of LEGACY) {
    next = next.replace(pattern, MERCHANT);
  }
  return next.trim();
}

async function main() {
  const envFile = process.argv[2] || path.join(process.cwd(), ".env.vercel.pulled");
  const env = loadEnv(envFile);
  const secret = (env.STRIPE_SECRET_KEY || "").trim();

  if (!secret) {
    console.error("STRIPE_SECRET_KEY missing. Run: vercel env pull .env.vercel.pulled --environment=production");
    process.exit(1);
  }

  const stripe = new Stripe(secret, { apiVersion: "2026-04-22.dahlia" });
  const account = await stripe.accounts.retrieve();

  await stripe.accounts.update(account.id, {
    business_profile: {
      name: MERCHANT,
    },
    settings: {
      payments: {
        statement_descriptor: DESCRIPTOR,
      },
    },
  });

  console.log("Account business profile:", MERCHANT);
  console.log("Statement descriptor:", DESCRIPTOR);

  const priceIds = [
    env.STRIPE_BASIC_PRICE_ID,
    env.STRIPE_PRO_PRICE_ID,
    env.STRIPE_PREMIUM_PRICE_ID,
    env.STRIPE_SCREENING_PRICE_ID || env.STRIPE_SCREENING_ID,
  ].filter(Boolean);

  const updatedProducts = new Set();

  for (const priceId of priceIds) {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const product = typeof price.product === "object" ? price.product : null;
    if (!product || updatedProducts.has(product.id)) continue;

    const nextName = normalizeName(product.name);
    if (nextName !== product.name) {
      await stripe.products.update(product.id, { name: nextName });
      console.log("Product renamed:", product.id, "→", nextName);
    } else {
      console.log("Product OK:", nextName);
    }
    updatedProducts.add(product.id);
  }

  let cursor;
  do {
    const page = await stripe.products.list({ limit: 100, starting_after: cursor });
    for (const product of page.data) {
      if (updatedProducts.has(product.id)) continue;
      const nextName = normalizeName(product.name);
      if (nextName !== product.name) {
        await stripe.products.update(product.id, { name: nextName });
        console.log("Product renamed:", product.id, "→", nextName);
      }
    }
    cursor = page.data.length > 0 ? page.data[page.data.length - 1].id : undefined;
  } while (cursor);

  console.log("\nStripe branding sync complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
