export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="brand-metric">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5a6980]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#0f2343]">{value}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{hint}</p>
    </div>
  );
}
