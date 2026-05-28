import { signOutAction } from "@/app/actions";
import { getRequestLocale } from "@/lib/i18n-server";

export async function SignOutForm({ className = "" }: { className?: string } = {}) {
  const locale = await getRequestLocale();
  return (
    <form action={signOutAction} className={className}>
      <button
        className="inline-flex min-h-9 items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        type="submit"
      >
        {locale === "el" ? "Αποσύνδεση" : "Sign out"}
      </button>
    </form>
  );
}
