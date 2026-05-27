export function BillingPlanFeatures({ features }: { features: readonly string[] }) {
  return (
    <ul className="billing-plan-card__features">
      {features.map((feature) => (
        <li className="flex items-start gap-3 text-sm leading-6 text-slate-700" key={feature}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b6b17]" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}
