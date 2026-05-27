import Link from "next/link";
import { ArrowRight, Presentation } from "lucide-react";

export function DemoWalkthroughBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-white">
          <Presentation className="h-4 w-4 text-amber-800" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950">Presentation cases are mixed with live data</p>
          <p className="text-xs leading-5 text-amber-900/80">
            Rows marked <span className="font-medium">Demo</span> are curated samples. Your operational cases appear in
            the board below.
          </p>
        </div>
      </div>
      <Link className="workspace-cta-secondary shrink-0 self-start sm:self-center" href="/demo">
        Guided walkthrough
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
