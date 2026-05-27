import { cn } from "@/lib/utils";

export function RiskChip({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <div className="risk-chip risk-chip--pending">
        <span className="risk-chip__score">—</span>
        <span className="risk-chip__label">Pending</span>
      </div>
    );
  }

  const band =
    score >= 80 ? "low" : score >= 60 ? "moderate" : "elevated";
  const label = score >= 80 ? "Low" : score >= 60 ? "Moderate" : "Elevated";

  return (
    <div className={cn("risk-chip", `risk-chip--${band}`)}>
      <span className="risk-chip__score">{score}</span>
      <span className="risk-chip__label">{label}</span>
    </div>
  );
}
