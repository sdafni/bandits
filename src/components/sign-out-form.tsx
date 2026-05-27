import { signOutAction } from "@/app/actions";

export function SignOutForm() {
  return (
    <form action={signOutAction} className="w-full sm:w-auto">
      <button
        className="secondary-action w-full rounded-full px-4 py-2 text-sm font-medium sm:w-auto"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
