"use client";

import { signOutAction } from "@/app/actions";
import { useT } from "@/lib/i18n/context";

export function AccountSignOutButton() {
  const t = useT();

  return (
    <form action={signOutAction}>
      <button
        className="workspace-cta-secondary min-h-12 w-full justify-center rounded-2xl px-5 text-sm font-semibold"
        type="submit"
      >
        {t("dashboard.signOut")}
      </button>
    </form>
  );
}
