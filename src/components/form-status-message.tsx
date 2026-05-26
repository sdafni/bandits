import type { ActionState } from "@/app/actions";

export function FormStatusMessage({ state }: { state: ActionState }) {
  if (!state.error && !state.success) {
    return null;
  }

  return (
    <p
      className={
        state.error
          ? "rounded-[20px] border border-[#eadcc3] bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-[#6a4f12]"
          : "rounded-[20px] border border-[#d9e5df] bg-[#f5fbf7] px-4 py-3 text-sm leading-6 text-[#21543b]"
      }
      role="status"
    >
      {state.error ?? state.success}
    </p>
  );
}
