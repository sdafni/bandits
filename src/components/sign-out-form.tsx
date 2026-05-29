import { signOutAction } from "@/app/actions";
import { getRequestLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

export async function SignOutForm({ className = "" }: { className?: string } = {}) {
  const locale = await getRequestLocale();

  return (
    <form action={signOutAction} className={className}>
      <button
        className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        type="submit"
      >
        {translate(locale, "workspace.signOutHint")}
      </button>
    </form>
  );
}
