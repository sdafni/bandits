/**
 * Apply missing production Supabase migrations (schema alignment only).
 *
 * Requires ONE of:
 *   SUPABASE_ACCESS_TOKEN  — Supabase Management API (account access token)
 *   SUPABASE_DB_PASSWORD   — direct Postgres (Settings → Database)
 *
 * Usage: node scripts/apply-production-schema.cjs
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const MIGRATIONS = [
  "202605260004_add_protection_architecture.sql",
  "202605280000_drop_legacy_create_tenant_check.sql",
  "202605280001_add_draft_workflow.sql",
  "202605300001_professional_report_pdf.sql",
];

const POOLER_HOSTS = [
  "aws-1-us-east-1.pooler.supabase.com:5432",
  "aws-0-eu-west-2.pooler.supabase.com:6543",
  "aws-0-us-east-1.pooler.supabase.com:6543",
  "aws-0-eu-central-1.pooler.supabase.com:6543",
];

function readEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i === -1) continue;
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim().replace(/^"|"$/g, "");
      if (value) env[key] = value;
    }
  }
  return env;
}

function projectRefFromUrl(url) {
  const match = String(url).match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : "";
}

async function applyViaManagementApi(projectRef, token, sql, name) {
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
    throw new Error(`Management API ${name}: HTTP ${res.status} ${text}`);
  }
  return text;
}

async function applyViaPostgres(projectRef, password, sql, name) {
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
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return { connectionString: connectionString.replace(/:[^:@/]+@/, ":***@") };
    } catch (error) {
      lastError = error;
      console.error(`[apply] ${name} via ${connectionString.replace(/:[^:@/]+@/, ":***@")}: ${error.message}`);
      await client.end().catch(() => undefined);
    }
  }
  throw new Error(`${name}: ${lastError?.message ?? "Postgres connection failed"}`);
}

async function ensureReportsBucket(admin) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === "safekey-reports")) {
    return "exists";
  }
  const { error } = await admin.storage.createBucket("safekey-reports", { public: false });
  if (error) throw new Error(`Bucket create: ${error.message}`);
  return "created";
}

async function main() {
  const env = readEnv();
  const projectRef = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const token = (env.SUPABASE_ACCESS_TOKEN || "").trim();
  const dbPassword = (env.SUPABASE_DB_PASSWORD || "").trim();

  if (!projectRef) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  if (!token && !dbPassword) {
    console.error("Set SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD in .env.local");
    process.exit(1);
  }

  const results = [];
  for (const file of MIGRATIONS) {
    const sqlPath = path.join(process.cwd(), "supabase", "migrations", file);
    const sql = fs.readFileSync(sqlPath, "utf8");
    if (token) {
      await applyViaManagementApi(projectRef, token, sql, file);
      results.push({ file, via: "management_api", status: "applied" });
    } else {
      const detail = await applyViaPostgres(projectRef, dbPassword, sql, file);
      results.push({ file, via: "postgres", status: "applied", ...detail });
    }
  }

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const bucket = await ensureReportsBucket(admin);

  console.log(JSON.stringify({ projectRef, results, bucket }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
