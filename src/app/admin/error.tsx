"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="card mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-950">Review desk unavailable</h1>
        <p className="text-sm leading-7 text-slate-600">
          The admin workflow could not be loaded. Retry or return to the queue list.
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
          <Link className="workspace-cta-secondary rounded-full px-5 py-3 text-sm font-semibold" href="/admin/review">
            Back to queue
          </Link>
        </div>
      </div>
    </main>
  );
}
