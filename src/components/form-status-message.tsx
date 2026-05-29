import type { ActionState } from "@/app/actions";
import { sanitizeUserFacingError } from "@/lib/form-validation";

export function FormStatusMessage({ state }: { state: ActionState }) {
  const safeError = state.error
    ? sanitizeUserFacingError(state.error, "Something went wrong. Please review the form and try again.")
    : undefined;

  if (!safeError && !state.success) {
    return null;
  }

  return (
    <p
      className={
        safeError
          ? "status-message border-rose-200 bg-rose-50 text-rose-800"
          : "status-message border-[#d9e5df] bg-[#f5fbf7] text-[#21543b]"
      }
      role="status"
    >
      {safeError ?? state.success}
    </p>
  );
}
