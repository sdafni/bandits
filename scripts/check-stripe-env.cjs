const keys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_BASIC_PRICE_ID",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_PREMIUM_PRICE_ID",
  "STRIPE_SCREENING_PRICE_ID",
  "STRIPE_SCREENING_ID",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

for (const key of keys) {
  const value = process.env[key] ?? "";
  console.log(`${key}: ${value ? `SET (len ${value.length})` : "MISSING/EMPTY"}`);
}
