import type { ReactNode } from "react";
import { cn } from "@/design-system/cn";

/*
 * Figures: the design system’s KpiStrip recipe (type, not tiles: one container
 * divided by hairlines, the label over the value, units as a grey suffix, a
 * delta that names its window and says good or bad) with values as nodes, so
 * a CountUp can sit in one. Promote into KpiStrip as a `value: ReactNode`.
 */
export interface Figure {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { text: string; tone: "positive" | "negative" | "muted" };
  lead?: boolean;
}

export function Figures({
  items,
  wide = false,
  bare = false,
  className,
}: {
  items: Figure[];
  /** All in one row (wide frames); otherwise two by two. Measured on the frame, not the window. */
  wide?: boolean;
  /** Inside a panel: the dividers without a frame of its own, so no card nests in a card. */
  bare?: boolean;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid divide-line",
        bare ? "border-t border-line" : "rounded-panel border border-line bg-panel",
        wide ? "auto-cols-fr grid-flow-col divide-x" : "grid-cols-2 divide-y",
        className
      )}
    >
      {items.map((k, i) => (
        <div
          key={k.label}
          className={cn(
            "min-w-0 px-4 py-3",
            !wide && i % 2 === 1 && "border-l border-line",
            !wide && items.length % 2 && i === items.length - 1 && "col-span-2"
          )}
        >
          <dt className="text-dense text-muted">{k.label}</dt>
          <dd className={cn("tabular mt-1 break-words", k.lead ? "text-kpi-lg" : "text-kpi")}>
            {k.value}
            {k.unit ? (
              <span className="ml-1 text-dense font-normal text-muted">{k.unit}</span>
            ) : null}
          </dd>
          {k.delta ? (
            <dd
              className={cn(
                "mt-0.5 text-dense",
                k.delta.tone === "positive"
                  ? "text-positive"
                  : k.delta.tone === "negative"
                    ? "text-negative"
                    : "text-muted"
              )}
            >
              {k.delta.text}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
