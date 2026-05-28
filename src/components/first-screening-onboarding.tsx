import { WorkspaceState } from "@/components/workspace-state";

const STEPS = [
  "Create a screening case with the tenant and property details.",
  "Share the secure upload link so documents are collected privately.",
  "Track review progress and receive a structured trust report.",
] as const;

export function FirstScreeningOnboarding() {
  return (
    <div className="space-y-3">
      <WorkspaceState
        actionHref="#new-screening"
        actionLabel="Create screening"
        description="Open a screening case, invite the tenant securely, and receive a structured trust report."
        title="Create your first tenant screening"
        variant="empty"
      />

      <section className="workspace-card space-y-3 p-4 sm:p-5">
        <p className="section-label">Getting started</p>
        <ol className="space-y-2.5">
          {STEPS.map((step, index) => (
            <li className="flex gap-3 text-sm leading-6 text-slate-700" key={step}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0f2343] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
