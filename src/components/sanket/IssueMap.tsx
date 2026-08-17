import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { priorityTier } from "@/lib/sanket";

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  priority_score: number;
  title: string;
};

const RESOLVED = new Set(["closed_verified", "resolved_pending_audit"]);

/**
 * Lightweight GIS canvas: normalises coordinates into a ward grid and renders
 * heat blooms for active issues and calm markers for resolved ones.
 */
export function IssueMap({
  points,
  className,
  onSelect,
}: {
  points: MapPoint[];
  className?: string;
  onSelect?: (id: string) => void;
}) {
  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const pad = 0.004;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [points]);

  return (
    <div className={cn("civic-grid relative overflow-hidden rounded-xl border bg-secondary/40", className)}>
      {!bounds && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No mapped issues yet
        </div>
      )}
      {bounds &&
        points.map((p) => {
          const x = ((p.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
          const y = (1 - (p.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
          const resolved = RESOLVED.has(p.status);
          const tier = priorityTier(p.priority_score);
          const size = resolved ? 14 : Math.min(56, 18 + p.priority_score * 2.2);
          return (
            <button
              key={p.id}
              type="button"
              title={`${p.title} — priority ${p.priority_score}`}
              onClick={() => onSelect?.(p.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
            >
              <span
                className={cn(
                  "block h-full w-full rounded-full border-2",
                  resolved
                    ? "border-success bg-success/40"
                    : tier.tone === "destructive"
                      ? "animate-pulse border-destructive bg-destructive/35"
                      : tier.tone === "warning"
                        ? "border-warning bg-warning/40"
                        : "border-info bg-info/30",
                )}
              />
            </button>
          );
        })}
      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-3 rounded-md bg-card/85 px-2.5 py-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-full bg-destructive" /> Critical
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-full bg-warning" /> High
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-full bg-info" /> Standard
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-full bg-success" /> Resolved
        </span>
      </div>
    </div>
  );
}
