/**
 * Verifies billing tables exist in the connected Supabase project.
 * Usage: node scripts/verify-billing-schema.cjs
 */
const fs = require("fs");
const path = require("path");
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
  return env;
}

const tables = [
  "billing_customers",
  "billing_subscriptions",
  "billing_invoices",
  "billing_checkout_sessions",
  "screening_payments",
  "stripe_webhook_events",
];

async function main() {
  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    results.push({
      table,
      ok: !error,
      error: error?.message ?? null,
    });
  }

  const missing = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ result: missing.length === 0 ? "ready" : "missing_tables", results }, null, 2));
  process.exit(missing.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(JSON.stringify({ result: "failed", error: error.message }, null, 2));
  process.exit(1);
});
