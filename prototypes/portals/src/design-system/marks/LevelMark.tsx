/**
 * Skill levels are four bars: Learning, Developing, Proficient, Mastered.
 * Not started is four empty bars (the approved end screen's rule; thresholds
 * from prototypes/daily10-end/core.js: under 35, 35 to 59, 60 to 79, 80 and up).
 */
export const BANDS = ["Not started", "Learning", "Developing", "Proficient", "Mastered"] as const;
export type Band = 0 | 1 | 2 | 3 | 4;
export const SEGMENTS: [number, number][] = [
  [0, 35],
  [35, 60],
  [60, 80],
  [80, 100],
];

export function band(p: number): Band {
  return p <= 0 ? 0 : p >= 80 ? 4 : p >= 60 ? 3 : p >= 35 ? 2 : 1;
}

/** The small mark: four rising bars, filled up to the band. */
export function LevelMark({
  level,
  size = 20,
  className,
}: {
  level: Band;
  size?: 20 | 24;
  className?: string;
}) {
  const heights = [8, 11, 14, 17];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={3 + i * 5}
          y={21 - h}
          width={4}
          height={h}
          rx={1}
          fill={i < level ? "rgb(var(--k-accent))" : "rgb(var(--k-text) / 0.16)"}
        />
      ))}
    </svg>
  );
}

/**
 * The level bar: four tracks in a row, each filled by the share of its segment
 * the score covers (the end screen's P.bar track). `was` draws a lost stretch.
 */
export function LevelBar({
  value,
  was,
  size = "md",
  className,
}: {
  value: number;
  was?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const part = (p: number, [a, b]: [number, number]) =>
    Math.max(0, Math.min(1, (p - a) / (b - a))) * 100;
  const h = size === "sm" ? 6 : size === "lg" ? 14 : 10;
  return (
    <div
      className={`grid gap-[3px] ${className ?? ""}`}
      style={{ gridTemplateColumns: "35fr 25fr 20fr 20fr", height: h }}
      aria-hidden="true"
    >
      {SEGMENTS.map((seg, i) => {
        const fill = part(value, seg);
        const lost = was !== undefined && was > value ? part(was, seg) - fill : 0;
        return (
          <span key={i} className="relative overflow-hidden rounded-[3px] bg-text/10">
            <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${fill}%` }} />
            {lost > 0 ? (
              <span
                className="absolute inset-y-0 bg-negative/60"
                style={{ left: `${fill}%`, width: `${lost}%` }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
