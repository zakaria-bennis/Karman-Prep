import { useRef } from "react";
import { cn } from "@/design-system/cn";
import { useWidth } from "@/design-system/components/hooks";

/*
 * A copy of the design system's Calendar (src/design-system/components/
 * Calendar.tsx) with one fix, for promotion into the shared system: the half
 * hour sits before the am/pm ("7:00 pm to 8:30 pm"), where the shared copy
 * printed "7 pm to 8 pm:30". Everything else is the shared component as it is.
 *
 * WeekCalendar: a week of classes and sessions. Days across, hours down, today
 * marked by a 1px accent line with its date in ink, and every kind of block
 * with its own mark so a class reads apart from a test at a glance: class a
 * pale accent fill, session an outline, test a hatch, workshop a dashed
 * outline. The legend is built from the kinds on screen. Under 560px the week
 * is a day list. The event list idea comes from Calendar with Event List
 * (21st.dev 25353, shadcnspace); its react-day-picker month grid was not used.
 */
export type EventKind = "class" | "session" | "test" | "workshop";
export interface CalEvent {
  id: string;
  day: number;
  start: number;
  end: number;
  kind: EventKind;
  title: string;
  who?: string;
}
export const KIND_LABELS: Record<EventKind, string> = {
  class: "Live class",
  session: "Full-length review session",
  test: "Full-length test",
  workshop: "Workshop",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function markClass(kind: EventKind) {
  return {
    class: "bg-accent/20 text-text",
    session: "border border-accent text-text",
    test: "k-hatch text-text",
    workshop: "border border-dashed border-border text-text",
  }[kind];
}

export function Legend({ kinds }: { kinds: EventKind[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
      {kinds.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded-[2px]", markClass(k))} aria-hidden="true" />
          {KIND_LABELS[k]}
        </li>
      ))}
    </ul>
  );
}

export function WeekCalendar({
  events,
  dates,
  today,
  from = 8,
  to = 22,
  className,
}: {
  events: CalEvent[];
  dates: string[];
  today: number;
  from?: number;
  to?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const narrow = useWidth(host) < 560;
  const kinds = [...new Set(events.map((e) => e.kind))];
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const hourH = 44;
  /** "7:00 pm", "8:30 pm", from a decimal hour; the axis keeps the short "7 pm". */
  const fmt = (h: number, axis = false) =>
    `${((Math.floor(h) + 11) % 12) + 1}${axis ? "" : h % 1 ? ":30" : ":00"} ${h >= 12 ? "pm" : "am"}`;
  const time = (e: CalEvent) => `${fmt(e.start)} to ${fmt(e.end)}`;
  return (
    <div ref={host} className={cn("grid gap-3", className)}>
      <Legend kinds={kinds} />
      {narrow ? (
        <ul className="divide-y divide-line">
          {DAYS.map((d, i) => {
            const list = events.filter((e) => e.day === i).sort((a, b) => a.start - b.start);
            return (
              <li key={d} className="grid gap-1.5 py-2">
                <p
                  className={cn(
                    "text-dense",
                    i === today ? "font-semibold text-text" : "text-muted"
                  )}
                >
                  {d} {dates[i]}
                  {i === today ? " (today)" : ""}
                </p>
                {list.length ? (
                  list.map((e) => (
                    <div
                      key={e.id}
                      className={cn("rounded-chip px-2 py-1.5 text-dense", markClass(e.kind))}
                    >
                      <span className="font-medium">{e.title}</span>
                      <span className="text-muted"> {time(e)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-small text-muted">Nothing scheduled</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: `44px repeat(7, minmax(0, 1fr))` }}>
          <span />
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "border-b border-line pb-2 text-center text-dense",
                i === today ? "font-semibold text-text" : "text-muted"
              )}
            >
              {d} <span className="tabular">{dates[i]}</span>
            </div>
          ))}
          <div className="relative" style={{ height: hours.length * hourH }}>
            {hours.map((h, i) => (
              <span
                key={h}
                className="tabular absolute right-2 -translate-y-1/2 text-small text-muted"
                style={{ top: i * hourH }}
              >
                {fmt(h, true)}
              </span>
            ))}
          </div>
          {DAYS.map((d, day) => (
            <div
              key={d}
              className={cn("relative border-l border-line", day >= 5 && "bg-text/[0.03]")}
              style={{ height: hours.length * hourH }}
            >
              {hours.map((h, i) => (
                <span
                  key={h}
                  className="absolute inset-x-0 border-t border-line/70"
                  style={{ top: i * hourH }}
                />
              ))}
              {day === today ? (
                <span className="absolute inset-y-0 left-0 w-px bg-accent" aria-hidden="true" />
              ) : null}
              {events
                .filter((e) => e.day === day)
                .map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-chip px-1.5 py-1 text-small leading-tight",
                      markClass(e.kind)
                    )}
                    style={{
                      top: (e.start - from) * hourH + 1,
                      height: (e.end - e.start) * hourH - 2,
                    }}
                    title={`${e.title}, ${time(e)}`}
                  >
                    <span className="line-clamp-2 break-words font-medium">{e.title}</span>
                    {(e.end - e.start) * hourH >= 60 ? (
                      <span className="line-clamp-1 break-words text-muted">
                        {time(e)}
                        {e.who ? `, ${e.who}` : ""}
                      </span>
                    ) : null}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
