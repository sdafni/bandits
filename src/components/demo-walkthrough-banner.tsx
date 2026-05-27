import Link from "next/link";
import { ArrowRight, Presentation } from "lucide-react";
import { getDemoWalkthroughSteps } from "@/lib/demo-data";

export function DemoWalkthroughBanner() {
  const steps = getDemoWalkthroughSteps().slice(0, 4);

  return (
    <section className="premium-panel space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8c490] bg-[#fffaf0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8b6b17]">
            <Presentation className="h-3.5 w-3.5" />
            Investor demo mode
          </div>
          <h2 className="section-title text-2xl sm:text-3xl">Curated portfolio loaded for walkthroughs</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
            SafeKey merges presentation cases into this workspace so you can show the full screening pipeline,
            analyst review, and approval outcomes without seeding production data.
          </p>
        </div>
        <Link className="secondary-action min-h-12 rounded-[18px] px-5 py-3" href="/demo">
          Open guided demo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <Link
            className="group rounded-[24px] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,35,67,0.08)]"
            href={step.href}
            key={step.step}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b6b17]">{step.step}</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{step.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{step.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
