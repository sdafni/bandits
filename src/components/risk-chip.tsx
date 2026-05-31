import { cn } from "@/lib/utils";
import { getRiskLevelFromScore, getRiskLevelLabel } from "@/lib/risk-report";

export function RiskChip({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <div className="risk-chip risk-chip--pending">
        <span className="risk-chip__score">—</span>
        <span className="risk-chip__label">Pending</span>
      </div>
    );
  }

  const riskLevel = getRiskLevelFromScore(score);
  const band = riskLevel === "low" ? "low" : riskLevel === "medium" ? "moderate" : "elevated";
  const label = getRiskLevelLabel(riskLevel);

  return (
    <div className={cn("risk-chip", `risk-chip--${band}`)}>
      <span className="risk-chip__score">{score}</span>
      <span className="risk-chip__label">{label}</span>
    </div>
  );
}
