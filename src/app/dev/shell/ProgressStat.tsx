"use client";

// One number's own page in Progress (founder, 2026-11-16: the numbers "can also be clickable and pull
// up relevant pages"). It is the predicted score's piece again, for this number: what it stands at,
// a ticker of how far it moved over the span, the spans, and the stock line. Pointing along the line
// shows the number as it stood that day.
import { useMemo, useState } from "react";
import lib from "./library.module.css";
import styles from "./progress.module.css";
import { Graph, Spans, niceMarks, spanFor, type SpanKey } from "./ProgressGraph";
import { dateOf, long, short, type DayLog, type Student } from "./progressData";
import { STATS, ledger, wayOf, type StatKey } from "./progressStats";

export default function ProgressStat({
  student,
  logs,
  stat: key,
}: {
  student: Student;
  logs: DayLog[];
  stat: StatKey;
}) {
  const stat = STATS[key];
  const series = useMemo(() => ledger(student, logs)[key], [student, logs, key]);
  const [wanted, setWanted] = useState<SpanKey>("all");
  const [at, setAt] = useState<number | null>(null);
  const span = spanFor(wanted, student.days);
  const from = span.days === Infinity ? 0 : student.days - span.days;
  const points = useMemo(
    () => series.slice(from).map((value, i) => ({ day: from + i, value: stat.plot(value) })),
    [series, from, stat]
  );
  const day = at === null ? student.days : Math.min(student.days, from + at);
  const past = day !== student.days;
  const moved = series[day] - series[from];
  const way = wayOf(stat, moved);
  return (
    <section
      className={`${lib.glass} ${styles.score}`}
      aria-label={stat.name}
      data-trend={wayOf(stat, series[student.days] - series[from]) === "down" ? "down" : "up"}
    >
      <div className={styles.head}>
        <h2>
          {stat.name}
          {past && ` on ${long(dateOf(student, day))}`}
        </h2>
        <p className={styles.total} data-long={stat.show(series[day]).length > 5 || undefined}>
          {stat.show(series[day])}
          {stat.after && <small>{stat.after}</small>}
        </p>
        <p className={styles.ticker} data-way={way}>
          {stat.moved(moved)} {past ? `since ${short(dateOf(student, from))}` : span.said}
        </p>
        {/* always there, so a number with a note is laid out like one without */}
        <p className={styles.examNote}>{stat.note}</p>
      </div>
      <Spans
        id="stat-span"
        history={student.days}
        span={span}
        onPick={(next) => {
          setWanted(next);
          setAt(null);
        }}
      />
      <Graph
        student={student}
        from={from}
        points={points}
        ticks={niceMarks(
          points.map((p) => p.value),
          { finest: stat.finest, least: stat.least, most: stat.most }
        )}
        format={stat.mark}
        label={stat.name}
        say={(i) => stat.show(series[from + i])}
        at={at}
        setAt={setAt}
      />
    </section>
  );
}
