/**
 * Probe production Supabase schema vs app requirements.
 * Usage: node scripts/probe-production-schema.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function readEnv() {
  const env = { ...process.env };
  const files = [".env.local", ".env"];
  for (const file of files) {
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

async function probeColumn(admin, table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  if (!error) return { ok: true };
  return { ok: false, error: error.message };
}

async function main() {
  const env = readEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const checks = [
    ["tenant_checks", "workflow_activated_at"],
    ["ai_reports", "pdf_storage_path"],
    ["ai_reports", "pdf_generated_at"],
    ["ai_reports", "pdf_version"],
  ];

  const columns = {};
  for (const [table, column] of checks) {
    columns[`${table}.${column}`] = await probeColumn(admin, table, column);
  }

  const { data: buckets } = await admin.storage.listBuckets();
  const bucketNames = (buckets ?? []).map((b) => b.name);

  const { data: checkSample } = await admin.from("tenant_checks").select("status").limit(1);
  let draftStatusOk = true;
  let draftStatusError = null;
  if (checkSample !== null) {
    const { error } = await admin.from("tenant_checks").insert({
      landlord_id: "00000000-0000-0000-0000-000000000001",
      property_id: "00000000-0000-0000-0000-000000000001",
      tenant_full_name: "__schema_probe__",
      status: "draft",
    });
    if (error) {
      draftStatusOk = false;
      draftStatusError = error.message;
    } else {
      await admin.from("tenant_checks").delete().eq("tenant_full_name", "__schema_probe__");
    }
  }

  const { error: rpcError } = await admin.rpc("create_tenant_check", {
    p_property_name: "x",
    p_address_line1: "x",
    p_city: "x",
    p_postal_code: "x",
    p_monthly_rent: 1,
    p_tenant_full_name: "x",
    p_tenant_email: "x@x.com",
    p_tenant_phone: null,
    p_requested_documents: ["passport"],
    p_upload_token_hash: null,
    p_upload_token_expires_at: null,
    p_secure_upload_url: null,
    p_status: "draft",
  });

  console.log(
    JSON.stringify(
      {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        columns,
        buckets: bucketNames,
        safekeyReportsBucket: bucketNames.includes("safekey-reports"),
        draftStatus: { ok: draftStatusOk, error: draftStatusError },
        createTenantCheckRpc: { ok: !rpcError, error: rpcError?.message ?? null },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
