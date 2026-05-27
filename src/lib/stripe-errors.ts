import Stripe from "stripe";

export function formatStripeError(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    const parts = [
      error.type,
      error.code,
      error.statusCode ? `HTTP ${error.statusCode}` : null,
      error.requestId ? `req ${error.requestId}` : null,
    ].filter(Boolean);

    return {
      message: error.message,
      detail: parts.join(" · ") || undefined,
      stripeType: error.type,
    };
  }

  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? error.cause.message : undefined;
    return {
      message: error.message,
      detail: cause,
    };
  }

  return {
    message: "Unknown Stripe error",
    detail: undefined,
  };
}

export function logStripeKeyMode(secretKey: string) {
  const trimmed = secretKey.trim();
  if (trimmed.startsWith("sk_live_")) {
    return "live";
  }
  if (trimmed.startsWith("sk_test_")) {
    return "test";
  }
  return "unknown";
}
