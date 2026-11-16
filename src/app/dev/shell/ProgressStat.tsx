"use client";

// One number's own page in Progress (founder, 2026-11-16). Two panes side by side, as wide as the
// Library's:
//   left    the number kept like a stock, as on the predicted score: what it stands at, a ticker, the
//           spans, and the line. Pointing along the line shows the number as it stood that day.
//   right   what stands behind the number, broken down for the same span (ProgressDetails.tsx).
// Pacing also splits into Reading and Writing and Math, and draws the student's goal across the graph:
// the pace the real SAT allows, longer for a student with extra time. It says how far over or under
// that goal the student is.
// On a phone the two panes are two pages with buttons, so neither scrolls a long way.
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import lib from "./library.module.css";
import styles from "./progress.module.css";
import { PACE_GOAL, PACE_PARTS, paceOf, type Found, type PacePart } from "./progressBreakdowns";
import { dateOf, long, short, type DayLog, type Student } from "./progressData";
import Details from "./ProgressDetails";
import page from "./progressDetails.module.css";
import { Graph, Spans, niceMarks, spanFor, type SpanKey } from "./ProgressGraph";
import { STATS, ledger, minSec, wayOf, type StatKey } from "./progressStats";
import { tick } from "./sound";

const PAGES = ["Trend", "Breakdown"] as const;

export default function ProgressStat({
  rail,
  student,
  logs,
  stat: key,
  extraTime,
  onSkill,
}: {
  rail: boolean;
  student: Student;
  logs: DayLog[];
  stat: StatKey;
  /** The student's accommodation: 1 for standard time, 1.5 or 2 for extra time. */
  extraTime: number;
  onSkill: (found: Found) => void;
}) {
  const still = useReducedMotion() ?? false;
  const stat = STATS[key];
  const book = useMemo(() => ledger(student, logs), [student, logs]);
  const [wanted, setWanted] = useState<SpanKey>("all");
  const [at, setAt] = useState<number | null>(null);
  const [part, setPart] = useState<PacePart>("all");
  const [shown, setShown] = useState<(typeof PAGES)[number]>("Trend");
  const span = spanFor(wanted, student.days);
  const from = span.days === Infinity ? 0 : student.days - span.days;
  const pacing = key === "pace";
  const series = useMemo(
    () => (pacing ? paceOf(book.pace, part) : book[key]),
    [book, key, pacing, part]
  );
  const goal = pacing ? Math.round(PACE_GOAL[part] * extraTime) : null;
  const points = useMemo(
    () => series.slice(from).map((value, i) => ({ day: from + i, value: stat.plot(value) })),
    [series, from, stat]
  );
  const day = at === null ? student.days : Math.min(student.days, from + at);
  const past = day !== student.days;
  const moved = series[day] - series[from];
  const over = goal === null ? 0 : series[day] - goal;
  const see = (name: (typeof PAGES)[number]) => rail || shown === name;

  return (
    <div className={`${lib.library} ${styles.progress} ${page.statPage}`} data-single>
      {!rail && (
        <div className={lib.pager} role="group" aria-label="Page">
          {PAGES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={shown === name}
              onClick={() => {
                setShown(name);
                tick();
              }}
            >
              {shown === name && (
                <motion.span
                  layoutId="stat-pager"
                  className={lib.lens}
                  transition={
                    still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                  }
                />
              )}
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}

      {see("Trend") && (
        <section
          className={`${lib.glass} ${styles.score} ${page.trend}`}
          aria-label={stat.name}
          data-trend={wayOf(series[student.days] - series[from]) === "down" ? "down" : "up"}
        >
          <div className={styles.head}>
            <h2>
              {pacing && part !== "all" ? `${PACE_PARTS[part]} pacing` : stat.name}
              {past && ` on ${long(dateOf(student, day))}`}
            </h2>
            <p className={styles.total} data-long={stat.show(series[day]).length > 5 || undefined}>
              {stat.show(series[day])}
              {stat.after && <small>{stat.after}</small>}
            </p>
            <p className={styles.ticker} data-way={wayOf(moved)}>
              {stat.moved(moved)} {past ? `since ${short(dateOf(student, from))}` : span.said}
            </p>
            {/* always there, so a number with a line here is laid out like one without */}
            <p className={styles.examNote}>
              {goal !== null &&
                (over === 0 ? (
                  <>On your goal of {minSec(goal)}</>
                ) : (
                  <>
                    <b data-way={over > 0 ? "down" : "up"}>{minSec(Math.abs(over))}</b>{" "}
                    {over > 0 ? "over" : "under"} your goal of {minSec(goal)}
                  </>
                ))}
            </p>
            {pacing && (
              <div className={styles.sections} role="group" aria-label="Pacing shown on the graph">
                {(Object.keys(PACE_PARTS) as PacePart[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={part === k}
                    onClick={() => {
                      setPart(k);
                      setAt(null);
                      tick();
                    }}
                  >
                    {PACE_PARTS[k]}
                    <b>{minSec(paceOf(book.pace, k)[day])}</b>
                  </button>
                ))}
              </div>
            )}
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
            ticks={niceMarks([...points.map((p) => p.value), ...(goal === null ? [] : [goal])], {
              finest: stat.finest,
              least: stat.least,
              most: stat.most,
            })}
            format={stat.mark}
            goal={goal === null ? undefined : { value: goal, label: `Your goal ${minSec(goal)}` }}
            label={stat.name}
            say={(i) => stat.show(series[from + i])}
            at={at}
            setAt={setAt}
          />
        </section>
      )}

      {see("Breakdown") && (
        <div className={page.side}>
          <Details
            stat={key}
            student={student}
            logs={logs}
            book={book}
            from={from}
            span={span}
            part={part}
            goal={goal}
            onSkill={onSkill}
          />
        </div>
      )}
    </div>
  );
}
