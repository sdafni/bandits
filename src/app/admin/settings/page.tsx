import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { MonetizationSettingsForm } from "@/components/admin/billing-funnel-settings-form";
import { requireAdmin } from "@/lib/auth";
import { getMonetizationConfig, isPlatformSettingsSchemaReady } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Monetization Settings",
  description: "Configure SafeKey MONETIZATION_MODE and billing gates.",
};

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const [config, schemaReady] = await Promise.all([getMonetizationConfig(), isPlatformSettingsSchemaReady()]);

  return (
    <main className="min-h-screen">
      <AppHeader
        homeHref="/admin/review"
        subtitle={`Monetization configuration for ${profile.full_name ?? profile.email}. See docs/monetization.md.`}
        title="Monetization settings"
        variant="admin"
      />

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {!schemaReady ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            The <code className="font-mono text-xs">platform_settings</code> table is not deployed yet. PREPAY defaults
            apply via code and optional <code className="font-mono text-xs">MONETIZATION_MODE</code> env.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="font-semibold text-[#0f2343] underline-offset-2 hover:underline" href="/admin/review">
            ← Back to review desk
          </Link>
        </div>

        <MonetizationSettingsForm config={config} />
      </div>
    </main>
  );
}
