"use client";

// One number's own page in Progress (founder, 2026-11-16). Two panes side by side, as wide as the
// Library's:
//   left    the number kept like a stock, as on the predicted score: what it stands at, a ticker, the
//           spans, and the line. Pointing along the line shows the number as it stood that day.
//   right   what stands behind the number, broken down for the same span (ProgressDetails.tsx).
// Pacing splits into Reading and Writing and Math, and draws the student's goal across the graph: the
// pace the real SAT allows, longer for a student with extra time. Questions answered carries accuracy
// too: a second button swaps the number and the line to the share answered right.
// The right-hand panes end level with the trend: the last one takes any height left over and stays
// empty there. Exams taken has no trend at all, only its list.
// On a phone nothing scrolls: the trend and each pane are pages of their own, with buttons.
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import lib from "./library.module.css";
import styles from "./progress.module.css";
import { PACE_GOAL, PACE_PARTS, paceOf, type Found, type PacePart } from "./progressBreakdowns";
import { dateOf, long, short, type DayLog, type Student } from "./progressData";
import Details, { Only, PANES } from "./ProgressDetails";
import page from "./progressDetails.module.css";
import { Graph, Spans, niceMarks, spanFor, type SpanKey } from "./ProgressGraph";
import { STATS, ledger, minSec, wayOf, type StatKey } from "./progressStats";
import { tick } from "./sound";

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
  const book = useMemo(() => ledger(student, logs), [student, logs]);
  const [wanted, setWanted] = useState<SpanKey | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const [part, setPart] = useState<PacePart>("all");
  /** Questions answered shows its count, or the share of them answered right. */
  const [rate, setRate] = useState(false);
  const [shown, setShown] = useState("Trend");
  const pacing = key === "pace";
  const stat = STATS[key === "questions" && rate ? "accuracy" : key];
  const span = spanFor(wanted, student.days, stat.allTime);
  const from = span.days === Infinity ? 0 : student.days - span.days;
  const series = useMemo(
    () =>
      pacing ? paceOf(book.pace, part) : key === "questions" && rate ? book.accuracy : book[key],
    [book, key, pacing, part, rate]
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
  // a count of exams over time says nothing, so that page is its list alone, across the whole page
  const lone = key === "exams";
  const pages = ["Trend", ...PANES[key]];
  const swap = (go: () => void) => {
    go();
    setAt(null);
    tick();
  };

  return (
    <div
      className={`${lib.library} ${styles.progress} ${page.statPage}`}
      data-single
      data-lone={lone || undefined}
    >
      {!rail && !lone && (
        <div className={`${lib.pager} ${page.tabs}`} role="group" aria-label="Page">
          {pages.map((name) => (
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

      {!lone && (rail || shown === "Trend") && (
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
                    onClick={() => swap(() => setPart(k))}
                  >
                    {PACE_PARTS[k]}
                    <b>{minSec(paceOf(book.pace, k)[day])}</b>
                  </button>
                ))}
              </div>
            )}
            {key === "questions" && (
              <div className={styles.sections} role="group" aria-label="Shown on the graph">
                <button
                  type="button"
                  aria-pressed={!rate}
                  onClick={() => swap(() => setRate(false))}
                >
                  Answered
                  <b>{STATS.questions.show(book.questions[day])}</b>
                </button>
                <button type="button" aria-pressed={rate} onClick={() => swap(() => setRate(true))}>
                  Accuracy
                  <b>{STATS.accuracy.show(book.accuracy[day])}</b>
                </button>
              </div>
            )}
          </div>
          <Spans
            id="stat-span"
            history={student.days}
            all={stat.allTime}
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

      {(rail || lone || shown !== "Trend") && (
        <div className={page.side} data-loose={key === "days" || undefined}>
          {/* on a phone only the pane whose page is open is drawn */}
          <Only.Provider value={rail || lone ? null : shown}>
            <Details
              stat={key}
              student={student}
              logs={logs}
              book={book}
              from={from}
              part={part}
              onSkill={onSkill}
            />
          </Only.Provider>
        </div>
      )}
    </div>
  );
}
