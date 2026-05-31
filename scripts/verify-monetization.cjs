/**
 * Monetization policy + permissions verification (no network).
 * Usage: node scripts/verify-monetization.cjs
 */
const {
  DEFAULT_MONETIZATION_CONFIG,
  MONETIZATION_MODE_PRESETS,
  parseMonetizationConfig,
  evaluateAllMonetizationGates,
  getMonetizationBlockReason,
  resolveMonetizationPermissions,
  shouldAutoActivateUploadLinkOnCheckCreate,
} = require("../src/lib/monetization/index.ts");

const NO_ENTITLEMENTS = {
  hasActiveSubscription: false,
  hasPerCheckPayment: false,
  hasReportUnlockPayment: false,
};

const WITH_PLAN = {
  hasActiveSubscription: true,
  hasPerCheckPayment: false,
  hasReportUnlockPayment: false,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function prepayConfig() {
  return parseMonetizationConfig({ mode: "PREPAY" });
}

function reportUnlockConfig() {
  return parseMonetizationConfig({ mode: "REPORT_UNLOCK" });
}

function testPrepayGates() {
  const config = prepayConfig();
  assert(config.mode === "PREPAY", "PREPAY mode parse");
  assert(
    config.gates.create_upload_link === "subscription_or_per_check",
    "PREPAY upload link gate",
  );

  const blocked = evaluateAllMonetizationGates(config, NO_ENTITLEMENTS);
  assert(!blocked.create_upload_link, "PREPAY: no plan blocks upload link");
  assert(blocked.tenant_upload, "PREPAY: tenant upload always free");

  const allowed = evaluateAllMonetizationGates(config, WITH_PLAN);
  assert(allowed.create_upload_link, "PREPAY: plan opens upload link");
  assert(allowed.run_analysis, "PREPAY: plan opens analysis");
  assert(allowed.view_report, "PREPAY: plan opens report");
}

function testPrepayPermissionsAndAutoCreate() {
  const config = prepayConfig();
  assert(
    !shouldAutoActivateUploadLinkOnCheckCreate(config, WITH_PLAN),
    "PREPAY: no auto upload link on check create (manual CTA)",
  );
  assert(
    !shouldAutoActivateUploadLinkOnCheckCreate(config, NO_ENTITLEMENTS),
    "PREPAY: no auto link without plan",
  );

  const gates = evaluateAllMonetizationGates(config, NO_ENTITLEMENTS);
  const permissions = resolveMonetizationPermissions({
    config,
    gates,
    billingNavEnabled: true,
    createUploadLinkBlockReason: getMonetizationBlockReason(
      "create_upload_link",
      config,
      NO_ENTITLEMENTS,
    ),
    viewFullReportBlockReason: getMonetizationBlockReason("view_report", config, NO_ENTITLEMENTS),
  });

  assert(!permissions.canCreateUploadLink, "PREPAY UI: cannot create link without plan");
  assert(permissions.shouldPromptPlanBeforeUploadLink, "PREPAY UI: should prompt plan modal");
}

function testReportUnlockConfig() {
  const config = reportUnlockConfig();
  assert(config.mode === "REPORT_UNLOCK", "REPORT_UNLOCK mode parse");
  assert(config.gates.create_upload_link === "free", "REPORT_UNLOCK: free upload link");
  assert(config.gates.view_report === "per_report_unlock", "REPORT_UNLOCK: report unlock gate");

  const gates = evaluateAllMonetizationGates(config, NO_ENTITLEMENTS);
  assert(gates.create_upload_link, "REPORT_UNLOCK: link without plan");
  assert(gates.run_analysis, "REPORT_UNLOCK: analysis without plan");
  assert(!gates.view_report, "REPORT_UNLOCK: report locked until unlock");

  assert(
    shouldAutoActivateUploadLinkOnCheckCreate(config, NO_ENTITLEMENTS),
    "REPORT_UNLOCK: auto link on check create",
  );

  const envParsed = parseMonetizationConfig({ mode: "REPORT_UNLOCK" });
  assert(envParsed.mode === "REPORT_UNLOCK", "REPORT_UNLOCK enable via config JSON");
}

function testLegacyAliases() {
  const legacy = parseMonetizationConfig({ mode: "plan_first" });
  assert(legacy.mode === "PREPAY", "legacy plan_first → PREPAY");
  const unlock = parseMonetizationConfig({ mode: "report_unlock" });
  assert(unlock.mode === "REPORT_UNLOCK", "legacy report_unlock → REPORT_UNLOCK");
}

function main() {
  const tests = [
    ["PREPAY gates", testPrepayGates],
    ["PREPAY permissions + auto-create", testPrepayPermissionsAndAutoCreate],
    ["REPORT_UNLOCK config", testReportUnlockConfig],
    ["Legacy mode aliases", testLegacyAliases],
  ];

  console.log("\nMonetization verification\n");
  for (const [name, fn] of tests) {
    fn();
    console.log(`✓ ${name}`);
  }

  console.log("\nAll monetization checks passed.\n");
  console.log(
    JSON.stringify(
      {
        prepayPreset: MONETIZATION_MODE_PRESETS.PREPAY,
        reportUnlockPreset: MONETIZATION_MODE_PRESETS.REPORT_UNLOCK,
        defaultMode: DEFAULT_MONETIZATION_CONFIG.mode,
      },
      null,
      2,
    ),
  );
}

main();
