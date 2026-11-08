import { Row, List } from "@/design-system/components/Row";
import { daysUntil } from "@/mock";
import { cn } from "@/design-system/cn";
import { useWide } from "./view";
import { WRAP_ROWS } from "./rows";
import type { Upcoming, UpKind } from "./mock-schedule";

/*
 * UpcomingList: what comes next. A row: a kind mark, the title with who it is
 * with, its date and time on the second line (every due item says "Due" with
 * its date, rule 55), and how far away it is: on the right on a wide frame,
 * folded into the second line on a phone so neither line is ever cut. The
 * row shape is the event list of Calendar With Event List (21st.dev 25353,
 * shadcnspace); its month grid, tinted row fills and three traffic-light
 * colours were not ported: the marks are the week calendar's (a class a pale
 * accent fill, a session an outline, a test a hatch, a workshop a dashed
 * outline), the SAT solid ink, the rest grey.
 */
export const MARK: Record<UpKind, string> = {
  class: "bg-accent/20",
  session: "border border-accent",
  test: "k-hatch",
  workshop: "border border-dashed border-border",
  practice: "bg-text/10",
  update: "border border-border",
  sat: "bg-text",
};

export function Mark({ kind, className }: { kind: UpKind; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block h-3.5 w-5 rounded-[2px]", MARK[kind], className)}
    />
  );
}

export function relative(date: string): string {
  const d = daysUntil(date);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 0) return `${-d} days ago`;
  return `In ${d} days`;
}

/** "Sat, Oct 31": short enough to sit beside a time on a phone. */
export function shortDay(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function when(item: Upcoming): string {
  const day = shortDay(item.date);
  return `${item.due ? "Due " : ""}${day}${item.time ? `, ${item.time}` : ""}`;
}

export function UpcomingList({
  items,
  max,
  onPress,
  total,
  viewAll,
  className,
}: {
  items: Upcoming[];
  max?: number;
  onPress?(item: Upcoming): void;
  total?: string;
  viewAll?: React.ReactNode;
  className?: string;
}) {
  const wide = useWide();
  const shown = max ? items.slice(0, max) : items;
  return (
    <List className={className} total={total} viewAll={viewAll}>
      {shown.map((it) => (
        <Row
          key={it.id}
          className={WRAP_ROWS}
          title={it.who ? `${it.title} with ${it.who}` : it.title}
          sub={{
            kind: it.due ? "due" : "date",
            text: wide ? when(it) : `${relative(it.date)}. ${when(it)}`,
          }}
          leading={<Mark kind={it.kind} />}
          trailing={wide ? relative(it.date) : undefined}
          onPress={onPress ? () => onPress(it) : undefined}
        />
      ))}
    </List>
  );
}
