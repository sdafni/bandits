import type { ActionState } from "@/app/actions";

export function FormStatusMessage({ state }: { state: ActionState }) {
  if (!state.error && !state.success) {
    return null;
  }

  return (
    <p
      className={
        state.error
          ? "status-message border-[#eadcc3] bg-[#fffaf2] text-[#6a4f12]"
          : "status-message border-[#d9e5df] bg-[#f5fbf7] text-[#21543b]"
      }
      role="status"
    >
      {state.error ?? state.success}
    </p>
  );
}
