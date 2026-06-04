import "server-only";

import { isAdminLandlordId } from "@/lib/admin-access";
import { isEntitledSubscriptionStatus } from "@/lib/billing";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type BillingCustomer = Database["public"]["Tables"]["billing_customers"]["Row"];
type BillingInvoice = Database["public"]["Tables"]["billing_invoices"]["Row"];
type BillingSubscription = Database["public"]["Tables"]["billing_subscriptions"]["Row"];
type ScreeningPayment = Database["public"]["Tables"]["screening_payments"]["Row"];

export type BillingOverview = {
  activeSubscription: BillingSubscription | null;
  customer: BillingCustomer | null;
  failedInvoices: BillingInvoice[];
  failedScreeningPayments: ScreeningPayment[];
  invoices: BillingInvoice[];
  recentScreeningPayments: ScreeningPayment[];
  schemaReady: boolean;
  screeningCredits: number;
  subscriptions: BillingSubscription[];
};

function isMissingBillingTableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table") === true ||
    error.message?.includes("billing_customers") === true
  );
}

export async function isBillingSchemaReady(options?: { admin?: boolean }) {
  const supabase = options?.admin ? createAdminClient() : await createClient();
  const { error } = await supabase.from("billing_customers").select("user_id").limit(1);

  if (isMissingBillingTableError(error)) {
    return false;
  }

  if (error) {
    throw error;
  }

  return true;
}

export async function getBillingOverviewForUser(
  userId: string,
  options?: { admin?: boolean },
): Promise<BillingOverview> {
  const supabase = options?.admin ? createAdminClient() : await createClient();

  const [
    { data: customer, error: customerError },
    { data: subscriptions, error: subscriptionsError },
    { data: invoices, error: invoicesError },
    { data: screeningPayments, error: screeningPaymentsError },
  ] = await Promise.all([
    supabase.from("billing_customers").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("current_period_end", { ascending: false, nullsFirst: false }),
    supabase
      .from("billing_invoices")
      .select("*")
      .eq("user_id", userId)
      .order("invoice_created_at", { ascending: false, nullsFirst: false })
      .limit(24),
    supabase
      .from("screening_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const billingErrors = [customerError, subscriptionsError, invoicesError, screeningPaymentsError];
  const schemaReady = !billingErrors.some((error) => isMissingBillingTableError(error));

  if (!schemaReady) {
    return {
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
  }

  const firstHardError = billingErrors.find((error) => error);
  if (firstHardError) {
    throw firstHardError;
  }

  const normalizedSubscriptions = subscriptions ?? [];
  const normalizedInvoices = invoices ?? [];
  const normalizedScreeningPayments = screeningPayments ?? [];
  const activeSubscription =
    normalizedSubscriptions.find((subscription) => isEntitledSubscriptionStatus(subscription.status)) ??
    normalizedSubscriptions.find((subscription) => subscription.status !== "canceled") ??
    null;

  return {
    activeSubscription,
    customer: customer ?? null,
    failedInvoices: normalizedInvoices.filter(
      (invoice) => invoice.status === "open" || invoice.status === "uncollectible",
    ),
    failedScreeningPayments: normalizedScreeningPayments.filter((payment) => payment.status === "failed"),
    invoices: normalizedInvoices,
    recentScreeningPayments: normalizedScreeningPayments,
    schemaReady: true,
    screeningCredits: normalizedScreeningPayments.filter((payment) => payment.status === "paid").length,
    subscriptions: normalizedSubscriptions,
  };
}

export async function getScreeningPaymentForCheck(
  checkId: string,
  options?: { admin?: boolean },
): Promise<ScreeningPayment | null> {
  const supabase = options?.admin ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("screening_payments")
    .select("*")
    .eq("tenant_check_id", checkId)
    .maybeSingle();

  if (isMissingBillingTableError(error)) {
    return null;
  }

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getBillingEligibilityForCheck({
  checkId,
  landlordId,
  useAdmin = false,
}: {
  checkId: string;
  landlordId: string;
  useAdmin?: boolean;
}) {
  const [overview, screeningPayment, landlordIsAdmin] = await Promise.all([
    getBillingOverviewForUser(landlordId, { admin: useAdmin }),
    getScreeningPaymentForCheck(checkId, { admin: useAdmin }),
    isAdminLandlordId(landlordId),
  ]);

  return {
    activeSubscription: overview.activeSubscription,
    customer: overview.customer,
    hasBillingAccess:
      landlordIsAdmin ||
      Boolean(overview.activeSubscription && isEntitledSubscriptionStatus(overview.activeSubscription.status)) ||
      screeningPayment?.status === "paid",
    schemaReady: overview.schemaReady,
    screeningPayment,
  };
}
