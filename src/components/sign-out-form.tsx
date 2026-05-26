import { signOutAction } from "@/app/actions";

export function SignOutForm() {
  return (
    <form action={signOutAction} className="w-full sm:w-auto">
      <button
        className="w-full rounded-full border border-[#dbe2eb] bg-white px-4 py-2 text-sm font-medium text-[#0f2343] transition hover:bg-[#f7f9fc] sm:w-auto"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
