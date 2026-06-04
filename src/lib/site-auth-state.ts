import { getCurrentUserContext } from "@/lib/auth";

export type SiteAuthState = { isAuthenticated: false } | { isAuthenticated: true };

export async function resolveSiteAuthState(): Promise<SiteAuthState> {
  const { user, profile } = await getCurrentUserContext();
  return user && profile ? { isAuthenticated: true } : { isAuthenticated: false };
}
