"use client";

// Progress, the predicted score (founder, 2026-11-15): first and centered. It reads like a
// stock: one large number, a ticker under it, a line with a fading fill, and spans of time to choose.
//   - One total, large. Reading and Writing and Math sit inside it, smaller. Never a range, never a goal.
//   - Pressing a section swaps the graph (and the large number) to that section; pressing it again, or
//     Total, goes back.
//   - The ticker is a signed number and its span in one weight and one color, like a stock app:
//     "+150 all time", "−30 past 7 days". Green up, red down. It is not a sentence.
//   - Spans: 7 days, 2 weeks, 1 month, 3 months, 6 months, 1 year, all time. A span appears only once
//     the student has studied that long. The line and its fill turn red when the score fell over it.
//   - The line starts at the first exam, never before it: no part of the graph is empty.
//   - Both axes fit what is shown: the days and the scores each fill the graph.
//   - Full-length exams are marked at their real scores: a small point with a ring breathing out from
//     it. The point being looked at is gray.
//   - Pointing at (or dragging along, or arrowing through) the line turns the number above into that
//     day's. Nothing floats over the graph, and there is no key.
//   - A prediction needs two full-length exams. Before that the same place says so.
//   - The countdown shows only when the student has entered a test date: a badge on the corner.
// Every number is a stand-in (progressData.ts). The demo bar switches between four made-up students so
// the scaling can be seen.
import { useMemo, useState } from "react";
import lib from "./library.module.css";
import { GoButton, Tile } from "./practice";
import styles from "./progress.module.css";
import { Graph, Spans, niceMarks, spanFor, type SpanKey } from "./ProgressGraph";
import {
  CHIPS,
  DAY,
  NAMES,
  STUDENTS,
  TODAY,
  dateOf,
  long,
  predict,
  short,
  split,
  type Series,
  type Student,
  type StudentKey,
} from "./progressData";
import { tick } from "./sound";

export default function ProgressScore({
  student: key,
  wanted,
  onSpan,
}: {
  student: StudentKey;
  /** The span chosen for the whole Progress page: the numbers beside the score follow it too. */
  wanted: SpanKey | null;
  onSpan: (span: SpanKey) => void;
}) {
  const student: Student = STUDENTS[key];
  const all = useMemo(() => predict(student), [student]);
  const [series, setSeries] = useState<Series>("total");
  const [at, setAt] = useState<number | null>(null);
  const [was, setWas] = useState(key);
  if (was !== key) {
    setWas(key);
    setAt(null);
  }

  // a span is offered only once the student has studied that long: the choices grow with them. The
  // line never starts before the first exam, whatever the span.
  const history = student.days;
  const span = spanFor(wanted, history);
  const first0 = all[0]?.day ?? 0;
  const from = span.days === Infinity ? first0 : Math.max(first0, student.days - span.days);
  const points = useMemo(() => all.filter((p) => p.day >= from), [all, from]);
  const exams = useMemo(
    () => student.exams.filter((e) => e.day >= from).map((e) => split(e.day, e.score)),
    [student, from]
  );
  const latest = points[points.length - 1];
  const first = points[0];
  // the day pointed at on the graph, if any: the number above shows that day instead of today
  const shown = at === null ? latest : (points[at] ?? latest);
  const past = shown !== latest;
  const moved = shown ? shown[series] - first[series] : 0;
  const fell = latest ? latest[series] < first[series] : false;
  // which full-length exam, counted from 1, was taken on the day pointed at (0 for none)
  const examOn = past ? student.exams.findIndex((e) => e.day === shown.day) + 1 : 0;
  const since = first ? `since ${short(dateOf(student, first.day))}` : "";
  const choose = (next: Series) => {
    setSeries(next);
    setAt(null);
    tick();
  };

  return (
    <section
      className={`${lib.glass} ${styles.score}`}
      aria-label="Predicted score"
      data-trend={fell ? "down" : "up"}
    >
      {student.testIn !== null && (
        <p
          className={styles.countdown}
          title={`Your SAT is on ${long(new Date(TODAY.getTime() + student.testIn * DAY))}`}
        >
          <b>{student.testIn}</b> days to your SAT
        </p>
      )}

      {latest ? (
        <>
          <div className={styles.head}>
            <h2>
              {NAMES[series]}
              {past && ` on ${long(dateOf(student, shown.day))}`}
            </h2>
            <p className={styles.total}>{shown[series]}</p>
            {/* the ticker: how far it has moved over the span, with a sign, green up and red down */}
            <p className={styles.ticker} data-way={moved > 0 ? "up" : moved < 0 ? "down" : "flat"}>
              {moved > 0 ? "+" : moved < 0 ? "−" : ""}
              {Math.abs(moved)} {past ? since : span.said}
            </p>
            {/* its place is always kept, so sliding across an exam never moves what is below */}
            <p className={styles.examNote} aria-live="polite">
              {examOn > 0 && `Full-length exam ${examOn}`}
            </p>
            <div className={styles.sections} role="group" aria-label="Score shown on the graph">
              {(["total", "rw", "math"] as const)
                .filter((k) => k !== "total" || series !== "total")
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={series === k}
                    onClick={() => choose(series === k ? "total" : k)}
                  >
                    {CHIPS[k]}
                    <b>{shown[k]}</b>
                  </button>
                ))}
            </div>
          </div>

          <Spans
            id="score-span"
            history={history}
            span={span}
            onPick={(next) => {
              onSpan(next);
              setAt(null);
            }}
          />

          <Graph
            student={student}
            from={from}
            points={points.map((p) => ({ day: p.day, value: p[series] }))}
            ticks={niceMarks(
              [...points, ...exams].map((p) => p[series]),
              series === "total"
                ? { least: 400, most: 1600, finest: 10 }
                : { least: 200, most: 800, finest: 10 }
            )}
            marked={exams.map((e) => ({ day: e.day, value: e[series] }))}
            label={NAMES[series]}
            say={(i) =>
              `${points[i].total}. Reading and Writing ${points[i].rw}, Math ${points[i].math}.`
            }
            at={at}
            setAt={setAt}
          />
        </>
      ) : (
        <div className={styles.waiting}>
          <Tile name="exam" />
          <h2>Take two full-length exams to see your predicted score</h2>
          <div
            className={styles.slots}
            role="img"
            aria-label={`${student.exams.length} of 2 taken`}
          >
            {[0, 1].map((i) => (
              <i key={i} data-on={i < student.exams.length || undefined}>
                {student.exams[i]?.score}
              </i>
            ))}
          </div>
          <p>
            <b>{student.exams.length}</b> of 2 taken
          </p>
          <GoButton>Start a full-length exam</GoButton>
        </div>
      )}
    </section>
  );
}
