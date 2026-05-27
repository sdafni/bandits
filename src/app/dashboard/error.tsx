"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="card mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard unavailable</h1>
        <p className="text-sm leading-7 text-slate-600">
          We could not load your workspace. Retry or return to billing if you were mid-checkout.
        </p>
        {error.message ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error.message}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button className="workspace-cta rounded-full px-5 py-3" onClick={reset} type="button">
            Retry
          </button>
          <a className="workspace-cta-secondary rounded-full px-5 py-3 text-sm font-semibold" href="/dashboard/billing">
            Open billing
          </a>
        </div>
      </div>
    </main>
  );
}
