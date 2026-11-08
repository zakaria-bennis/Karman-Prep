import { cn } from "../cn";

/*
 * KPI: type, not tiles. One container divided by hairlines, the label over the
 * value, units as a grey suffix, a delta that names its window and says good
 * or bad. The answer figure (lead) is 36px; its siblings 24px; nothing larger.
 */
export interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; tone: "positive" | "negative" | "muted" };
  lead?: boolean;
}

export function KpiStrip({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid divide-line rounded-panel border border-line bg-panel sm:auto-cols-fr sm:grid-flow-col sm:divide-x",
        "grid-cols-2 divide-y sm:divide-y-0",
        className
      )}
    >
      {items.map((k, i) => (
        <div
          key={k.label}
          className={cn(
            "px-4 py-3",
            items.length % 2 && i === items.length - 1 && "col-span-2 sm:col-span-1"
          )}
        >
          <dt className="text-dense text-muted">{k.label}</dt>
          <dd className={cn("tabular mt-1", k.lead ? "text-kpi-lg" : "text-kpi")}>
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
