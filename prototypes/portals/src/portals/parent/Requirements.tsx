import { Pill } from "@/design-system/components/Pill";
import { cn } from "@/design-system/cn";
import type { Requirement } from "./mock-plan";
import { useArrived } from "./arrive";

/*
 * Requirements: the guarantee’s requirements, each with its current count
 * against its threshold: a track as long as the whole program, the part done
 * filled in the accent, a 1px ink tick at the threshold (the app rules'
 * bullet), and the counts in words. The header’s "all on track" line and the
 * list follow Multi-Step Progress (21st.dev 29469, sean0205); its check
 * icons and single bar became a bar per requirement. The terms themselves are
 * never restated here.
 */
export function Requirements({
  rows,
  onTrack,
  wide = false,
  className,
}: {
  rows: Requirement[];
  onTrack: boolean;
  /** Two columns of requirements on a wide frame. */
  wide?: boolean;
  className?: string;
}) {
  const arrived = useArrived();
  return (
    <div className={cn("grid gap-1", className)}>
      <p className="flex items-center justify-between gap-3 text-dense text-muted">
        <span>
          {rows.filter((r) => r.ok).length} of {rows.length} requirements on track
        </span>
        <Pill tone={onTrack ? "positive" : "negative"}>{onTrack ? "On track" : "At risk"}</Pill>
      </p>
      <ul
        className={cn(
          wide
            ? "grid grid-cols-2 gap-x-8 [&>li]:border-b [&>li]:border-line"
            : "divide-y divide-line"
        )}
      >
        {rows.map((r) => {
          const total = r.kind === "percent" ? 100 : (r.total ?? r.threshold);
          const fillPct = Math.min(100, (r.current / total) * 100);
          const tickPct = Math.min(100, (r.threshold / total) * 100);
          return (
            <li key={r.id} className="grid gap-1.5 py-3">
              <p className="flex items-start justify-between gap-3">
                <span className="text-body font-medium">{r.label}</span>
                {!r.ok ? <Pill tone="negative">Behind</Pill> : null}
              </p>
              {r.kind === "date" ? (
                <p className="tabular text-dense text-muted">{r.detail}</p>
              ) : (
                <>
                  <span
                    role="progressbar"
                    aria-label={r.label}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={r.current}
                    aria-valuetext={r.detail}
                    className="relative block h-2 w-full overflow-hidden rounded-pill bg-text/10"
                  >
                    {r.current > 0 ? (
                      <span
                        className="absolute inset-y-0 left-0 origin-left rounded-pill bg-accent transition-transform duration-700 ease-k"
                        style={{ width: `${fillPct}%`, transform: `scaleX(${arrived ? 1 : 0})` }}
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 w-px bg-text"
                      style={{ left: `calc(${tickPct}% - 1px)` }}
                    />
                  </span>
                  <p className="tabular text-dense text-muted">{r.detail}</p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
