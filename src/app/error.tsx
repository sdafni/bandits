"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="card max-w-2xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
          Something went wrong
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-950">The workflow could not be completed</h1>
          <p className="text-sm leading-7 text-slate-600">
            SafeKey hit an unexpected error while loading this step. You can retry the request or return to
            the previous page.
          </p>
        </div>
        {error.message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error.message}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[#0f2343] px-5 py-3 text-sm font-semibold text-white"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <button
            className="rounded-full border border-[#d8c490] px-5 py-3 text-sm font-semibold text-[#0f2343]"
            onClick={() => window.history.back()}
            type="button"
          >
            Go back
          </button>
        </div>
      </div>
    </main>
  );
}
