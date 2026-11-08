import { cn } from "@/design-system/cn";
import { useArrived } from "./arrive";

/*
 * WeekStrip: this week’s questions answered as seven columns, Monday to
 * Sunday, each labelled with its count; today’s day label in ink, a day still
 * to come an empty slot, a zero with no bar. One hue (the accent) on the one
 * data series; the bars rise from the baseline on arrival. Drawn to the app
 * rules; no chart library.
 */
export function WeekStrip({
  days,
  labels,
  today,
  className,
}: {
  days: (number | null)[];
  labels: string[];
  today: number;
  className?: string;
}) {
  const arrived = useArrived();
  const max = Math.max(1, ...days.map((v) => v ?? 0));
  const summary = days.map((v, i) => `${labels[i]} ${v === null ? "to come" : v}`).join(", ");
  return (
    <div
      role="img"
      aria-label={`Questions answered this week: ${summary}`}
      className={cn("grid grid-cols-7 gap-1.5", className)}
    >
      {days.map((v, i) => {
        const h = v === null || v === 0 ? 0 : Math.max(4, Math.round((v / max) * 72));
        return (
          <div key={labels[i]} className="grid content-end justify-items-center gap-1">
            <span
              className={cn(
                "tabular text-small",
                v === null ? "text-muted" : v === 0 ? "text-muted" : "text-text"
              )}
            >
              {v === null ? " " : v}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "block w-full max-w-[28px] origin-bottom rounded-t-[3px]",
                v === null
                  ? "h-[72px] border border-dashed border-border/60"
                  : "bg-accent transition-transform duration-700 ease-k"
              )}
              style={
                v === null ? undefined : { height: h, transform: `scaleY(${arrived ? 1 : 0})` }
              }
            />
            <span
              className={cn(
                "border-t border-line pt-1 text-small",
                i === today ? "font-semibold text-text" : "text-muted"
              )}
            >
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
