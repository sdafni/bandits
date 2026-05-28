import { signOutAction } from "@/app/actions";
import { getRequestLocale } from "@/lib/i18n-server";

export async function SignOutForm() {
  const locale = await getRequestLocale();
  return (
    <form action={signOutAction} className="w-full sm:w-auto">
      <button
        className="secondary-action w-full rounded-full px-4 py-2 text-sm font-medium sm:w-auto"
        type="submit"
      >
        {locale === "el" ? "Αποσύνδεση" : "Sign out"}
      </button>
    </form>
  );
}
