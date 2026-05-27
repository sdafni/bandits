import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card max-w-xl space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">SafeKey link unavailable</p>
        <h1 className="text-3xl font-semibold text-slate-950">This page could not be found</h1>
        <p className="text-sm leading-7 text-slate-600">
          The SafeKey upload or review link may be invalid, expired, or no longer available.
        </p>
        <Link className="primary-action rounded-full px-5 py-3" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
