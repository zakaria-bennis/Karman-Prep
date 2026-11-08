import { cn } from "@/design-system/cn";
import { Pill } from "@/design-system/components/Pill";
import { fmtDate } from "@/mock";
import type { Requirement } from "../mock-work";

/*
 * RequirementRow: one guarantee requirement as a bullet bar (taste-skill's
 * Charts.bullet idea): the track is what the program holds, the fill is the
 * count so far, a 2px tick marks the threshold, and the date it must be met by
 * sits at the right. Colour only where it says something: a slipping row's
 * fill turns negative, a met row's tick turns positive. No 21st.dev fit was
 * found for a bullet bar (the searches returned goal meters and steppers).
 */
export function RequirementRow({ r }: { r: Requirement }) {
  const total = r.total ?? r.needed;
  const fill = Math.min(1, r.current / total);
  const tick = Math.min(1, r.needed / total);
  const value =
    r.unit === "percent"
      ? `${r.current}% of ${r.needed}%`
      : r.unit === "date"
        ? (r.note ?? "")
        : `${r.current} of ${r.needed}${r.total ? ` (${r.total} in the program)` : ""}`;
  const tone = r.met ? "positive" : r.slipping ? "negative" : "neutral";
  return (
    <div className="grid gap-1.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-dense font-medium">{r.label}</p>
        <Pill tone={tone}>{r.met ? "Met" : r.slipping ? "Slipping" : "On track"}</Pill>
      </div>
      {r.unit === "date" ? null : (
        <div
          className="relative h-2 overflow-hidden rounded-pill bg-text/10"
          role="progressbar"
          aria-label={r.label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={r.current}
          aria-valuetext={value}
        >
          {fill > 0 ? (
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-pill",
                r.slipping ? "bg-negative" : "bg-accent"
              )}
              style={{ width: `${fill * 100}%` }}
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn("absolute inset-y-0 w-0.5", r.met ? "bg-positive" : "bg-text/60")}
            style={{ left: `calc(${tick * 100}% - 1px)` }}
          />
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-x-3 text-small text-muted">
        <span className="tabular">
          {value}
          {r.note && r.unit !== "date" ? ` · ${r.note}` : ""}
        </span>
        <span className="tabular">by {fmtDate(r.by)}</span>
      </div>
    </div>
  );
}
