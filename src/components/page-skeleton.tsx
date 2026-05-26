export function PageSkeleton({
  title = "Loading workspace",
  subtitle = "Preparing the latest verification data.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <main className="min-h-screen">
      <div className="border-b border-[#d9cba2] bg-white/95">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-8 w-72 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-4 w-[28rem] max-w-full animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="card">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">{title}</p>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="card space-y-4" key={index}>
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-9 w-20 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="card space-y-4" key={index}>
              <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
              <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
