import { priorityBreakdown, priorityTier } from "@/lib/sanket";
import { Chip } from "./StatusBadge";

export function PriorityMeter({
  score,
  severity,
  reportCount,
  createdAt,
  verifiedEvidence,
  compact,
}: {
  score: number;
  severity: number;
  reportCount: number;
  createdAt: string;
  verifiedEvidence: number;
  compact?: boolean;
}) {
  const tier = priorityTier(score);
  const parts = priorityBreakdown({ severity, reportCount, createdAt, verifiedEvidence });

  if (compact) {
    return (
      <Chip tone={tier.tone}>
        {tier.label} · {score.toFixed(2)}
      </Chip>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Priority score</p>
          <p className="font-mono text-3xl font-semibold">{score.toFixed(2)}</p>
        </div>
        <Chip tone={tier.tone}>{tier.label}</Chip>
      </div>
      <ul className="space-y-2">
        {parts.map((p) => (
          <li key={p.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {p.label} <span className="font-mono">({p.raw} × {p.weight})</span>
              </span>
              <span className="font-mono">{p.value.toFixed(2)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (p.value / Math.max(score, 0.01)) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Formula: severity×0.35 + min(reports,20)×0.25 + pending hours×0.20 + verified evidence×0.20
      </p>
    </div>
  );
}
