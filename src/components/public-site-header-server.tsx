import type { ReactNode } from "react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { resolveSiteAuthState } from "@/lib/site-auth-state";

export async function PublicSiteHeaderServer({ children }: { children?: ReactNode }) {
  const auth = await resolveSiteAuthState();
  return <PublicSiteHeader auth={auth}>{children}</PublicSiteHeader>;
}
