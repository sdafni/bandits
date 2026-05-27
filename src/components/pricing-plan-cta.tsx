import Link from "next/link";
import { getCurrentUserContext } from "@/lib/auth";
import { buildBillingPath, buildLoginHref, type BillingPlanIntent } from "@/lib/billing-navigation";
import { cn } from "@/lib/utils";

export async function PricingPlanCta({
  children,
  className,
  plan,
}: {
  children: React.ReactNode;
  className?: string;
  plan: BillingPlanIntent;
}) {
  const { user } = await getCurrentUserContext();
  const href = user
    ? plan === "screening"
      ? buildBillingPath("screening")
      : `/dashboard/billing/start?plan=${plan}`
    : buildLoginHref(plan);

  return (
    <Link className={cn(className)} href={href}>
      {children}
    </Link>
  );
}
