import { RecoveryNavigationActions } from "@/components/recovery-navigation-actions";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card max-w-xl space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">SafeKey route unavailable</p>
        <h1 className="text-3xl font-semibold text-slate-950">This route is unavailable</h1>
        <p className="text-sm leading-7 text-slate-600">
          The link may be outdated or moved. Your data remains safe and you can continue from a known page.
        </p>
        <RecoveryNavigationActions />
      </div>
    </main>
  );
}
