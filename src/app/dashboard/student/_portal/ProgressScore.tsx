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
//   - A prediction needs two full-length exams. Before that the same place says what to do next.
//   - The countdown shows only when the student has entered a test date: a dark badge inside the
//     top right corner, with the date under it. The days and the date are written in a color that
//     says how near the test is, with a shine that passes over them: blue when it is more than a
//     month away, gold within a month, red within a week (founder, 2026-11-16).
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
  TODAY,
  dateOf,
  long,
  predict,
  short,
  pointOf,
  type Series,
  type Student,
  type StudentKey,
  BEFORE_EXAM,
} from "./progressData";
import { tick } from "./sound";
import { usePortalData, useStudent } from "./portalData";
import { askUpgrade, startOr } from "./upgradeStore";
import { DAILY_10 } from "@/lib/student/quiz-routes";

/** How near the test is, for the badge's color: within a week, within a month, or farther off. */
const nearness = (days: number) => (days <= 7 ? "week" : days <= 31 ? "month" : "far");

function Countdown({ days }: { days: number }) {
  const on = new Date(TODAY.getTime() + days * DAY);
  return (
    <p className={styles.countdown} data-near={nearness(days)}>
      <span>
        {days === 0 ? (
          "Your SAT is today"
        ) : (
          <>
            <b>{days}</b> {days === 1 ? "day" : "days"} to your SAT
          </>
        )}
      </span>
      {/* the year is said only when it is not this one */}
      <em>
        {long(on)}
        {on.getFullYear() !== TODAY.getFullYear() && `, ${on.getFullYear()}`}
      </em>
    </p>
  );
}

/** The score's place before there is a score. A prediction needs two full-length exams. Until then
 *  it says what to do next (founder, 2026-11-15): the Daily 10 first; a full-length exam is suggested
 *  once 100 questions are answered, and can be taken sooner; on the Free plan the score comes with
 *  Practice or Pro. */
function Waiting({
  student,
  answered,
  free,
}: {
  student: Student;
  answered: number;
  free: boolean;
}) {
  const taken = student.exams.length;
  const real = usePortalData();
  const gate = real && { planId: real.planId, access: real.access };
  // the list of full-length exams knows which one is next and what the plan still opens
  const exams = () => real && window.location.assign("/learn/tests");
  if (free)
    return (
      <div className={styles.waiting}>
        <Tile name="exam" />
        <h2>Your predicted score comes with Practice or Pro</h2>
        <GoButton onDone={() => askUpgrade("score")}>Upgrade</GoButton>
      </div>
    );
  const ready = taken > 0 || answered >= BEFORE_EXAM;
  return (
    <div className={styles.waiting}>
      <Tile name={ready ? "exam" : "daily"} />
      <h2>Take two full-length exams to see your predicted score</h2>
      {ready ? (
        <>
          <div className={styles.slots} role="img" aria-label={`${taken} of 2 taken`}>
            {[0, 1].map((i) => (
              <i key={i} data-on={i < taken || undefined}>
                {student.exams[i]?.score}
              </i>
            ))}
          </div>
          <p>
            <b>{taken}</b> of 2 taken
          </p>
          <GoButton onDone={exams}>Start a full-length exam</GoButton>
        </>
      ) : (
        <>
          {/* how far along the first hundred questions are, as a band and a count */}
          <div
            className={styles.toExam}
            role="img"
            aria-label={`${answered} of ${BEFORE_EXAM} questions answered`}
          >
            <i style={{ width: `${Math.round((answered / BEFORE_EXAM) * 100)}%` }} />
          </div>
          <p>
            <b>{answered}</b> of {BEFORE_EXAM} questions before your first exam
          </p>
          <GoButton onDone={() => startOr(gate, "questions", DAILY_10.path)}>
            Start the Daily 10
          </GoButton>
          <button
            type="button"
            className={styles.sooner}
            onClick={() => {
              tick();
              exams();
            }}
          >
            Take an exam now
          </button>
        </>
      )}
    </div>
  );
}

export default function ProgressScore({
  student: key,
  answered,
  free,
  wanted,
  onSpan,
}: {
  student: StudentKey;
  /** How many questions the student has answered so far. */
  answered: number;
  /** Whether the student is on the Free plan, which has no predicted score. */
  free: boolean;
  /** The span chosen for the whole Progress page: the numbers beside the score follow it too. */
  wanted: SpanKey | null;
  onSpan: (span: SpanKey) => void;
}) {
  const student: Student = useStudent(key);
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
    () => student.exams.filter((e) => e.day >= from).map(pointOf),
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
      {student.testIn !== null && <Countdown days={student.testIn} />}

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
        <Waiting student={student} answered={answered} free={free} />
      )}
    </section>
  );
}
