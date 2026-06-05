const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function readEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env.vercel.production"]) {
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

async function main() {
  const env = readEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await admin
    .from("tenant_public_profiles")
    .select("credit_report_consent, credit_report_consent_at, credit_report_requested_at")
    .limit(1);
  console.log(JSON.stringify({ url: env.NEXT_PUBLIC_SUPABASE_URL, result }, null, 2));
  process.exit(result.error ? 1 : 0);
}

main();
