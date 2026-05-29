import "server-only";

import type { BillingOverview } from "@/lib/billing-queries";
import { getBillingOverviewForUser } from "@/lib/billing-queries";

const EMPTY_BILLING_OVERVIEW: BillingOverview = {
  activeSubscription: null,
  customer: null,
  failedInvoices: [],
  failedScreeningPayments: [],
  invoices: [],
  recentScreeningPayments: [],
  schemaReady: false,
  screeningCredits: 0,
  subscriptions: [],
};

export async function getSafeBillingOverviewForUser(
  userId: string,
  options?: { admin?: boolean },
): Promise<BillingOverview> {
  try {
    return await getBillingOverviewForUser(userId, options);
  } catch {
    return { ...EMPTY_BILLING_OVERVIEW };
  }
}
