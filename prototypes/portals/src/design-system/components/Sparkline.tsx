import { useId, useRef, useState } from "react";
import { cn } from "../cn";

/*
 * Sparkline: one small line for a score trend option, straight segments, a
 * baseline, the end point marked, scrubbing by pointer or arrow keys. Ported
 * from Sparkline (21st.dev 35038, kuratlielia) with its curve smoothing and
 * motion library removed: the app rules want straight segments.
 */
export function Sparkline({
  data,
  labels,
  label,
  width = 160,
  height = 48,
  format = (v: number) => String(v),
  className,
}: {
  data: number[];
  labels?: string[];
  label: string;
  width?: number;
  height?: number;
  format?(v: number): string;
  className?: string;
}) {
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<number | null>(null);
  const n = data.length;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const span = hi - lo || 1;
  const inset = 4;
  const pt = (i: number) =>
    [
      n > 1 ? (i / (n - 1)) * width : width / 2,
      inset + (1 - (data[i] - lo) / span) * (height - inset * 2),
    ] as const;
  const pts = data.map((_, i) => pt(i));
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const i = at ?? n - 1;
  const [cx, cy] = pts[i] ?? [0, 0];
  const pointAt = (clientX: number) => {
    const r = host.current?.getBoundingClientRect();
    if (!r) return;
    setAt(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left) / r.width) * (n - 1)))));
  };
  return (
    <figure className={cn("grid gap-1", className)} aria-label={`${label}: ${format(data[n - 1])}`}>
      <figcaption className="flex items-baseline justify-between gap-3 text-dense">
        <span className="text-muted">{label}</span>
        <span className="tabular font-semibold">
          {format(data[i])}
          {labels?.[i] ? <span className="ml-1.5 font-normal text-muted">{labels[i]}</span> : null}
        </span>
      </figcaption>
      <div
        ref={host}
        role="slider"
        tabIndex={0}
        aria-label={`${label}, explore values`}
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={i + 1}
        aria-valuetext={`${labels?.[i] ?? `Point ${i + 1}`}: ${format(data[i])}`}
        onPointerDown={(e) => pointAt(e.clientX)}
        onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons) && pointAt(e.clientX)}
        onPointerLeave={() => setAt(null)}
        onBlur={() => setAt(null)}
        onKeyDown={(e) => {
          const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          setAt(Math.max(0, Math.min(n - 1, i + d)));
        }}
        className="cursor-crosshair touch-none rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          aria-hidden="true"
          style={{ display: "block" }}
        >
          <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke="rgb(var(--k-line))" />
          <polyline
            points={line}
            fill="none"
            stroke="rgb(var(--k-accent))"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {at !== null ? (
            <line
              x1={cx}
              x2={cx}
              y1={0}
              y2={height}
              stroke="rgb(var(--k-border))"
              strokeDasharray="2 3"
            />
          ) : null}
          <circle id={id} cx={cx} cy={cy} r={at !== null ? 4.5 : 3.5} fill="rgb(var(--k-accent))" />
        </svg>
      </div>
    </figure>
  );
}
