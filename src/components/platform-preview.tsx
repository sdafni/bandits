import { AlertCircle, BadgeCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type PlatformPreviewProps = {
  className?: string;
};

const queue = [
  { applicant: "Athens applicant", status: "Under review", meta: "Documents complete" },
  { applicant: "Marousi applicant", status: "Awaiting upload", meta: "Link issued 14:08" },
  { applicant: "Piraeus applicant", status: "Ready for release", meta: "Analyst sign-off pending" },
] as const;

const workflow = [
  { label: "Verification request opened", status: "complete", meta: "Landlord workspace" },
  { label: "Document pack received", status: "complete", meta: "Identity and income received" },
  { label: "Reference validation pending", status: "attention", meta: "Final reviewer follow-up" },
] as const;

const timeline = [
  { label: "Bank statement stored", time: "09:14" },
  { label: "Identity match confirmed", time: "09:38" },
  { label: "Reference check requested", time: "10:05" },
] as const;

export function PlatformPreview({ className }: PlatformPreviewProps) {
  return (
    <section className={cn("brand-visual-card gap-4 p-5 sm:p-6", className)}>
      <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#42526b]">Workspace snapshot</p>
          <h3 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-950">A calm review environment for live rental decisions</h3>
        </div>

        <div className="inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42526b]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#183454]" />
          Tenant Passport Greece
        </div>
      </div>

      <div className="brand-visual-frame relative z-[1] p-3 sm:p-4">
        <div className="overflow-hidden rounded-[24px] border border-[#dfe6ef] bg-white shadow-[0_8px_18px_rgba(15,35,67,0.03)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#e7edf4] px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a6980]">SafeKey review desk</p>
              <p className="mt-1 text-sm font-semibold text-[#0f2343]">Operational queue</p>
            </div>

            <div className="rounded-full bg-[#f7f9fc] px-3 py-1.5 text-xs font-medium text-[#42526b]">4 active cases</div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-[#e7edf4] bg-[#fbfcfe] p-4 lg:border-b-0 lg:border-r">
              <div className="space-y-3">
                {queue.map((item, index) => (
                  <div
                    className={cn(
                      "rounded-[18px] px-4 py-3 transition",
                      index === 0 ? "bg-white shadow-[0_4px_12px_rgba(15,35,67,0.04)]" : "bg-transparent",
                    )}
                    key={item.applicant}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0f2343]">{item.applicant}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.meta}</p>
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5a6980]">{item.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a6980]">Case overview</p>
                  <p className="text-lg font-semibold tracking-[-0.02em] text-[#0f2343]">Athens applicant review</p>
                </div>

                <div className="rounded-full border border-[#e5ddd0] bg-[#fbf9f5] px-3 py-1 text-xs font-medium text-[#5d4e31]">
                  Conditional approve
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Trust score" value="82" />
                <Metric label="Documents" value="6/6" />
                <Metric label="Flags" value="1" />
              </div>

              <p className="max-w-[28rem] text-sm leading-6 text-slate-600">
                Identity and income checks are strong. Final release is waiting on one remaining reference confirmation.
              </p>

              <div className="space-y-3">
                {workflow.map((step) => (
                  <div className="flex items-start gap-3" key={step.label}>
                    <div className="mt-0.5">
                      {step.status === "complete" ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-[#183454]" />
                      ) : (
                        <AlertCircle className="h-4.5 w-4.5 text-[#5d4e31]" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[#0f2343]">{step.label}</p>
                      <p className="text-xs leading-5 text-slate-500">{step.meta}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#edf1f6] pt-4">
                <div className="space-y-2">
                  {timeline.map((item) => (
                    <div className="flex items-center justify-between gap-4 text-sm" key={item.label}>
                      <div className="inline-flex items-center gap-2 text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-[#183454]" />
                        {item.label}
                      </div>
                      <span className="text-xs font-medium text-[#5a6980]">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#42526b]">
                <BadgeCheck className="h-3.5 w-3.5 text-[#6d5a2a]" />
                Private storage, scoped access, timeline retained.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5a6980]">{label}</p>
      <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-[#0f2343]">{value}</p>
    </div>
  );
}
