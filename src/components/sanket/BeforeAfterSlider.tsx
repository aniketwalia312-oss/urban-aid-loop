import { useRef, useState } from "react";
import { useEvidenceUrl } from "./EvidenceImage";

export function BeforeAfterSlider({ beforePath, afterPath }: { beforePath: string; afterPath: string }) {
  const before = useEvidenceUrl(beforePath);
  const after = useEvidenceUrl(afterPath);
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const move = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="relative aspect-video w-full cursor-ew-resize select-none overflow-hidden rounded-xl border bg-muted"
        onPointerDown={(e) => move(e.clientX)}
        onPointerMove={(e) => e.buttons === 1 && move(e.clientX)}
      >
        {after && <img src={after} alt="After repair" className="absolute inset-0 h-full w-full object-cover" />}
        {before && (
          <img
            src={before}
            alt="Before repair"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          />
        )}
        <div className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${pos}%` }}>
          <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
            ⇆
          </span>
        </div>
        <span className="absolute left-2 top-2 rounded bg-card/85 px-2 py-0.5 text-xs font-medium">Before</span>
        <span className="absolute right-2 top-2 rounded bg-card/85 px-2 py-0.5 text-xs font-medium">After</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        aria-label="Compare before and after"
        onChange={(e) => setPos(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  );
}
