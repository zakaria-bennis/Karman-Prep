import { useId } from "react";
import { cn } from "../cn";

/*
 * ProgressBar: both ends labelled, the fill the true ratio (so 303 of 2,000
 * fills 15 percent), a zero has no stub. The accessible shape (progressbar,
 * valuetext, a live completion note) follows Progress Bar (21st.dev 23549,
 * ddoemonn); its inset shadow, pending shimmer and blue were left out.
 */
export function ProgressBar({
  value,
  max,
  label,
  startLabel,
  endLabel,
  className,
}: {
  value: number;
  max: number;
  label: string;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}) {
  const id = useId();
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span id={id} className="text-dense font-medium">
          {label}
        </span>
        <span className="tabular text-dense text-muted">{Math.round(fraction * 100)}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value.toLocaleString("en-US")} of ${max.toLocaleString("en-US")}`}
        className="h-2 overflow-hidden rounded-pill bg-text/10"
      >
        {fraction > 0 ? (
          <span
            className="block h-full rounded-pill bg-accent transition-[width] duration-500 ease-k"
            style={{ width: `${fraction * 100}%` }}
          />
        ) : null}
      </div>
      {startLabel || endLabel ? (
        <div className="flex justify-between text-small text-muted">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
