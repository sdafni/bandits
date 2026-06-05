/**
 * Apply credit report migrations to production Supabase.
 * Usage: node scripts/apply-credit-report-migration.cjs
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const POOLER_HOSTS = [
  "aws-1-us-east-1.pooler.supabase.com:5432",
  "aws-0-eu-west-2.pooler.supabase.com:6543",
  "aws-0-us-east-1.pooler.supabase.com:6543",
  "aws-0-eu-central-1.pooler.supabase.com:6543",
];

const MIGRATION_FILES = [
  "supabase/migrations/202606020001_credit_report_consent.sql",
  "supabase/migrations/202606020002_credit_report_requested.sql",
];

function readEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env.vercel.production", ".env.vercel.pulled", ".env"]) {
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

function projectRefFromUrl(url) {
  const match = String(url).match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : "";
}

async function applyViaManagementApi(projectRef, token, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, read_only: false }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API: HTTP ${res.status} ${text}`);
  }
  return text;
}

async function applyViaPostgres(projectRef, password, sql) {
  const enc = encodeURIComponent(password);
  const urls = [
    process.env.SUPABASE_DATABASE_URL,
    process.env.DATABASE_URL,
    ...POOLER_HOSTS.map((hostPort) => {
      const [host, port] = hostPort.split(":");
      return `postgresql://postgres.${projectRef}:${enc}@${host}:${port}/postgres`;
    }),
  ].filter(Boolean);

  let lastError = null;
  for (const connectionString of urls) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return connectionString.replace(/:[^:@/]+@/, ":***@");
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
    }
  }
  throw lastError ?? new Error("Postgres connection failed");
}

async function verifySchema(adminUrl, serviceKey) {
  const { createClient } = require("@supabase/supabase-js");
  const admin = createClient(adminUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profiles = await admin
    .from("tenant_public_profiles")
    .select("credit_report_consent, credit_report_consent_at, credit_report_requested_at")
    .limit(1);

  if (profiles.error) {
    throw new Error(`tenant_public_profiles credit columns: ${profiles.error.message}`);
  }

  return {
    credit_report_consent: "column readable",
    credit_report_consent_at: "column readable",
    credit_report_requested_at: "column readable",
    sample: profiles.data?.[0] ?? null,
  };
}

async function main() {
  const env = readEnv();
  const projectRef = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const token = (env.SUPABASE_ACCESS_TOKEN || "").trim();
  const dbPassword = (env.SUPABASE_DB_PASSWORD || "").trim();
  const sql = MIGRATION_FILES.map((file) =>
    fs.readFileSync(path.join(process.cwd(), file), "utf8"),
  ).join("\n\n");

  if (!projectRef) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!token && !dbPassword && !env.DATABASE_URL && !env.SUPABASE_DATABASE_URL) {
    throw new Error("Set SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, or DATABASE_URL");
  }

  let via = "unknown";
  if (token) {
    await applyViaManagementApi(projectRef, token, sql);
    via = "management_api";
  } else {
    await applyViaPostgres(projectRef, dbPassword, sql);
    via = env.DATABASE_URL || env.SUPABASE_DATABASE_URL ? "database_url" : "postgres_pooler";
  }

  const verification = await verifySchema(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(JSON.stringify({ ok: true, projectRef, via, migrations: MIGRATION_FILES, verification }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
});
