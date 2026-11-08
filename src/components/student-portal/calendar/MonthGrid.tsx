/* This month at a glance: today marked, and dots for sessions, events and tests due. */
import { Legend, SectionHeader } from "@/components/portal";
import { dayLabel, monthGrid, type MarkKind } from "@/lib/student/calendar";
import styles from "./calendar.module.css";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MonthGrid({
  todayKey,
  marks,
}: {
  todayKey: string;
  marks: ReadonlyMap<string, ReadonlySet<MarkKind>>;
}) {
  const g = monthGrid(todayKey, marks);
  return (
    <>
      <SectionHeader title={g.label} />
      <ol className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ol>
      <ol className={styles.grid} aria-label={g.label}>
        {Array.from({ length: g.lead }, (_, i) => (
          <li key={`lead-${i}`} aria-hidden="true" />
        ))}
        {g.days.map((d) => (
          <li
            key={d.key}
            className={styles.cell}
            data-today={d.isToday ? "" : undefined}
            aria-current={d.isToday ? "date" : undefined}
          >
            <span className="kp-sr">{dayLabel(d, g.label)}</span>
            <span aria-hidden="true">{d.day}</span>
            <span className={styles.dots} aria-hidden="true">
              {d.marks.map((k) => (
                <i key={k} className={styles.dot} data-kind={k} />
              ))}
            </span>
          </li>
        ))}
      </ol>
      <Legend
        items={[
          { label: "Session", color: "var(--l4)" },
          { label: "Workshop or office hours", color: "var(--l2)" },
          { label: "Test due", color: "var(--late)" },
        ]}
      />
    </>
  );
}
