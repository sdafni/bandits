import "server-only";

import { cache } from "react";
import {
  DEFAULT_MONETIZATION_CONFIG,
  MONETIZATION_SETTINGS_KEY,
  parseMonetizationConfig,
  serializeMonetizationConfig,
  type MonetizationConfig,
  type MonetizationMode,
} from "@/lib/monetization";
import type { Json } from "@/lib/database.types";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const LEGACY_SETTINGS_KEY = "billing_funnel";

function isMissingPlatformSettingsTable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table") === true ||
    error.message?.includes("platform_settings") === true
  );
}

function configFromEnvFallback(): MonetizationConfig {
  const envMode = env.monetizationMode;
  if (!envMode) {
    return { ...DEFAULT_MONETIZATION_CONFIG, gates: { ...DEFAULT_MONETIZATION_CONFIG.gates } };
  }

  return parseMonetizationConfig({ mode: envMode });
}

async function readSettingsRow(key: string) {
  const admin = createAdminClient();
  return admin.from("platform_settings").select("value").eq("key", key).maybeSingle();
}

export const getMonetizationConfig = cache(async (): Promise<MonetizationConfig> => {
  try {
    const primary = await readSettingsRow(MONETIZATION_SETTINGS_KEY);

    if (isMissingPlatformSettingsTable(primary.error)) {
      return configFromEnvFallback();
    }

    if (primary.error) {
      throw primary.error;
    }

    if (primary.data?.value) {
      return parseMonetizationConfig(primary.data.value);
    }

    const legacy = await readSettingsRow(LEGACY_SETTINGS_KEY);
    if (legacy.data?.value) {
      return parseMonetizationConfig(legacy.data.value);
    }

    return configFromEnvFallback();
  } catch {
    return configFromEnvFallback();
  }
});

/** @deprecated Use getMonetizationConfig */
export const getBillingFunnelConfig = getMonetizationConfig;

export async function updateMonetizationConfig(
  config: MonetizationConfig,
  updatedByUserId: string,
): Promise<MonetizationConfig> {
  const admin = createAdminClient();
  const value = serializeMonetizationConfig(config) as Json;

  const { data, error } = await admin
    .from("platform_settings")
    .upsert(
      {
        key: MONETIZATION_SETTINGS_KEY,
        updated_by: updatedByUserId,
        value,
      },
      { onConflict: "key" },
    )
    .select("value")
    .single();

  if (error) {
    throw error;
  }

  return parseMonetizationConfig(data.value);
}

/** @deprecated Use updateMonetizationConfig */
export const updateBillingFunnelConfig = updateMonetizationConfig;

export async function isPlatformSettingsSchemaReady() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("platform_settings").select("key").limit(1);
    return !isMissingPlatformSettingsTable(error);
  } catch {
    return false;
  }
}

export function resolveMonetizationModeFromEnv(): MonetizationMode | null {
  return env.monetizationMode;
}
