import "server-only";

import { env } from "@/lib/env";
import { createSecureToken, hashToken } from "@/lib/security";

const UPLOAD_LINK_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type SecureUploadCredentials = {
  token: string;
  tokenHash: string;
  uploadUrl: string;
  expiresAt: string;
};

export function buildTenantUploadUrl(token: string) {
  return new URL(`/upload/${token}`, env.appUrl).toString();
}

/** Generates a unique tenant upload token, hash, public URL, and expiry for persistence. */
export function createSecureUploadCredentials(): SecureUploadCredentials {
  const token = createSecureToken();
  const expiresAt = new Date(Date.now() + UPLOAD_LINK_TTL_MS).toISOString();

  return {
    token,
    tokenHash: hashToken(token),
    uploadUrl: buildTenantUploadUrl(token),
    expiresAt,
  };
}
