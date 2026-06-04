import type { Metadata } from "next";
import { LandingSiteHeader } from "@/components/landing-site-header";
import { PublicSiteFooterContent } from "@/components/public-site-footer-content";
import { SampleReportPageContent } from "@/components/sample-report-page-content";
import { resolveSiteAuthState } from "@/lib/site-auth-state";

export const metadata: Metadata = {
  title: "Sample SafeKey Report",
  description:
    "Preview a real SafeKey tenant screening deliverable with trust score, recommendation, risk summary, documents, and PDF report.",
};

export default async function SampleReportPage() {
  const auth = await resolveSiteAuthState();

  return (
    <main className="min-h-screen">
      <LandingSiteHeader auth={auth} />
      <SampleReportPageContent />
      <div className="page-shell pb-10">
        <PublicSiteFooterContent showTrustLayer={false} />
      </div>
    </main>
  );
}
