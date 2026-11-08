import { useState } from "react";
import { Row } from "@/design-system/components/Row";
import { fmtDate } from "@/mock";
import { cn } from "@/design-system/cn";
import { WRAP_ROWS } from "./rows";
import type { WeeklyUpdate } from "./mock-updates";

/*
 * UpdateTimeline: the updates by week on a vertical rail, newest first, a dot
 * for each week and a line between them, the latest marked. Ported from
 * Milestone Timeline (21st.dev 28384, olewandowski1): the rail, the dot
 * column and the date line per item are kept; its icon tiles, status badges,
 * serif heading and monospace dates became the design system's row and pill.
 * The week is the title and is never cut; the questions answered follow the
 * sent date on the second line. Capped with the total stated, never paginated.
 */
/** "Oct 19 to 25", or "Oct 26 to Nov 1" across a month. */
export function weekRange(u: WeeklyUpdate): string {
  const a = fmtDate(u.weekStart);
  const b = fmtDate(u.weekEnd);
  const sameMonth = a.split(" ")[0] === b.split(" ")[0];
  return `${a} to ${sameMonth ? b.split(" ")[1] : b}`;
}
export function weekTitle(u: WeeklyUpdate): string {
  return `Week of ${weekRange(u)}`;
}

export function UpdateTimeline({
  items,
  selectedId,
  onOpen,
  max = 8,
  className,
}: {
  items: WeeklyUpdate[];
  selectedId?: string;
  onOpen(u: WeeklyUpdate): void;
  max?: number;
  className?: string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, max);
  return (
    <div className={cn("grid gap-2", className)}>
      <ol className="grid">
        {shown.map((u, i) => {
          const latest = i === 0;
          const last = i === shown.length - 1;
          const sent = `Sent Sunday, ${fmtDate(u.sentOn)}. ${u.questions} questions`;
          return (
            <li key={u.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
              <span className="relative flex flex-col items-center pt-5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    latest ? "bg-accent" : "border-2 border-border bg-panel"
                  )}
                />
                {last ? null : <span aria-hidden="true" className="w-px flex-1 bg-line" />}
              </span>
              <div className={cn(!last && "border-b border-line")}>
                <Row
                  className={WRAP_ROWS}
                  title={weekRange(u)}
                  sub={
                    latest
                      ? { kind: "state", text: `Latest. ${sent}` }
                      : { kind: "date", text: sent }
                  }
                  selected={u.id === selectedId}
                  onPress={() => onOpen(u)}
                />
              </div>
            </li>
          );
        })}
      </ol>
      {items.length > max ? (
        <div className="flex items-center justify-between pt-1 text-dense text-muted">
          <span>{items.length} updates</span>
          <button
            type="button"
            onClick={() => setAll((a) => !a)}
            className="min-h-tap font-semibold text-accent hover:underline"
          >
            {all ? "Show the latest 8" : `Show all ${items.length}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
