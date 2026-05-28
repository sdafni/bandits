import { env } from "@/lib/env";

/** True on live SafeKey deployment — demo portfolio cases stay out of the workspace. */
export function isProductionDeployment() {
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  const host = env.appUrl.replace(/^https?:\/\//, "").toLowerCase();
  return host === "getsafekey.app" || host === "www.getsafekey.app";
}
