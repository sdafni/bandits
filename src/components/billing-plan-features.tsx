export function BillingPlanFeatures({ features }: { features: readonly string[] }) {
  return (
    <ul className="billing-plan-card__features">
      {features.map((feature) => (
        <li className="flex items-start gap-2 text-xs leading-5 text-slate-600" key={feature}>
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}
