import { cn } from "../cn";

/*
 * Heatmap: streak days as one square a day, seven rows of weekdays, weeks
 * across, levels as the accent at four strengths. The calendar layout and
 * level mix follow Activity Heatmap (21st.dev 36571, dhxwhy); its three views,
 * autoplay, tooltip and stats were not ported. Values are minutes practised.
 */
export interface DayValue {
  date: string;
  value: number;
}
const LEVEL_MIX = [0, 0.28, 0.48, 0.72, 1];
const DAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Heatmap({
  data,
  end,
  weeks = 16,
  cell = 12,
  label = "Practice days",
  className,
}: {
  data: DayValue[];
  end: string;
  weeks?: number;
  cell?: number;
  label?: string;
  className?: string;
}) {
  const by = new Map(data.map((d) => [d.date, d.value]));
  const endDate = new Date(end + "T12:00:00");
  const offset = (endDate.getDay() + 6) % 7; // Monday first
  const start = new Date(endDate);
  start.setDate(endDate.getDate() - (weeks * 7 - 1) - (6 - offset));
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const gap = 3;
  const left = 30;
  const top = 16;
  const months: { x: number; label: string }[] = [];
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = key(d);
    const v = by.get(k) ?? 0;
    const col = Math.floor(i / 7);
    const row = i % 7;
    if (d.getDate() <= 7 && row === 0)
      months.push({
        x: left + col * (cell + gap),
        label: d.toLocaleDateString("en-US", { month: "short" }),
      });
    const level = v <= 0 ? 0 : Math.min(4, Math.ceil((v / maxV) * 4));
    return { k, v, col, row, level, future: d > endDate };
  });
  const w = left + weeks * (cell + gap);
  const h = top + 7 * (cell + gap);
  return (
    <figure
      className={cn("w-full", className)}
      aria-label={`${label}: ${data.filter((d) => d.value > 0).length} active days`}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        style={{ display: "block", maxWidth: w }}
        aria-hidden="true"
      >
        {months.map((m) => (
          <text key={m.label + m.x} x={m.x} y={10} fontSize="11" fill="rgb(var(--k-muted))">
            {m.label}
          </text>
        ))}
        {DAYS.map((d, r) =>
          d ? (
            <text
              key={d}
              x={0}
              y={top + r * (cell + gap) + cell - 2}
              fontSize="11"
              fill="rgb(var(--k-muted))"
            >
              {d}
            </text>
          ) : null
        )}
        {cells.map((c) =>
          c.future ? null : (
            <rect
              key={c.k}
              x={left + c.col * (cell + gap)}
              y={top + c.row * (cell + gap)}
              width={cell}
              height={cell}
              rx={2}
              fill={c.level ? "rgb(var(--k-accent))" : "rgb(var(--k-text))"}
              fillOpacity={c.level ? LEVEL_MIX[c.level] : 0.08}
            >
              <title>{`${c.k}: ${c.v ? `${c.v} min` : "no practice"}`}</title>
            </rect>
          )
        )}
      </svg>
      <figcaption className="mt-1 flex items-center justify-end gap-1.5 text-small text-muted">
        <span>Less</span>
        {LEVEL_MIX.map((m, i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ background: i ? `rgb(var(--k-accent) / ${m})` : "rgb(var(--k-text) / 0.08)" }}
          />
        ))}
        <span>More</span>
      </figcaption>
    </figure>
  );
}
