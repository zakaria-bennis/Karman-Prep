"use client";

// Progress, step 1 of 6 (founder, 2026-11-15): the predicted score, first and centered.
//   - One total, large. Reading and Writing and Math sit inside it, smaller. Never a range, never a goal.
//   - One line of how the prediction has moved. Both axes fit the student: the days run from their first
//     day to today, and the scores run over their own range, so 6 days and 7 months, or +70 and +460,
//     each fill the graph.
//   - Full-length exams are marked on the graph at their real scores.
//   - Pointing at (or dragging along, or arrowing through) the line turns the score above it into that
//     day's: the total and the two section scores. Nothing floats over the graph.
//   - A prediction needs two full-length exams. Before that the same place says so.
//   - The countdown shows only when the student has entered a test date.
// Every number is a stand-in: no student data is read. The demo bar switches between four made-up
// students so the scaling can be seen.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import lib from "./library.module.css";
import { GoButton, Tile } from "./practice";
import styles from "./progress.module.css";

/** The day the stand-ins call today, fixed so the server and the browser draw the same page. */
const TODAY = new Date(2026, 10, 15);
const DAY = 86_400_000;
const round10 = (n: number) => Math.round(n / 10) * 10;

type Exam = { day: number; score: number };
type Student = {
  label: string;
  /** Days since they began. */
  days: number;
  exams: Exam[];
  /** Today's prediction. */
  now: number;
  /** Days until the test date they entered, if they entered one. */
  testIn: number | null;
};

export const STUDENTS = {
  new: { label: "6 days", days: 6, exams: [{ day: 4, score: 1180 }], now: 0, testIn: null },
  weeks3: {
    label: "3 weeks",
    days: 21,
    exams: [
      { day: 2, score: 1200 },
      { day: 12, score: 1230 },
      { day: 20, score: 1270 },
    ],
    now: 1270,
    testIn: 48,
  },
  weeks9: {
    label: "9 weeks",
    days: 63,
    exams: [
      { day: 3, score: 1200 },
      { day: 14, score: 1230 },
      { day: 28, score: 1290 },
      { day: 42, score: 1320 },
      { day: 56, score: 1370 },
    ],
    now: 1380,
    testIn: 20,
  },
  months7: {
    label: "7 months",
    days: 212,
    exams: [
      { day: 6, score: 1090 },
      { day: 24, score: 1120 },
      { day: 45, score: 1190 },
      { day: 70, score: 1240 },
      { day: 96, score: 1310 },
      { day: 121, score: 1350 },
      { day: 148, score: 1420 },
      { day: 170, score: 1460 },
      { day: 196, score: 1530 },
    ],
    now: 1550,
    testIn: 20,
  },
} as const satisfies Record<string, Student>;
export type StudentKey = keyof typeof STUDENTS;

type Point = { day: number; total: number; math: number; rw: number };

/** The prediction for every day from the second exam to today: it follows the exams, with a little
 *  life in it, in tens. */
function predict(student: Student): Point[] {
  const { exams, days, now } = student;
  if (exams.length < 2) return [];
  const marks = [...exams.slice(1), { day: days, score: now }];
  const points: Point[] = [];
  for (let day = exams[1].day; day <= days; day++) {
    const next = marks.findIndex((m) => m.day >= day);
    const a = marks[Math.max(0, next - 1)];
    const b = marks[next];
    const t = b.day === a.day ? 1 : (day - a.day) / (b.day - a.day);
    const wobble = day === days ? 0 : Math.sin(day * 0.9) * 4 + Math.sin(day * 0.31) * 5;
    const total = round10(a.score + (b.score - a.score) * t + wobble);
    const math = round10(total * (0.51 + 0.015 * Math.sin(day / 9)));
    points.push({ day, total, math, rw: total - math });
  }
  return points;
}

const dateOf = (student: Student, day: number) =>
  new Date(TODAY.getTime() - (student.days - day) * DAY);
const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const long = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

/** Marks along the days: every other day for a week or two, weeks for a couple of months, then months. */
function dayMarks(student: Student): { day: number; label: string }[] {
  const { days } = student;
  if (days > 100) {
    const marks: { day: number; label: string }[] = [];
    const first = dateOf(student, 0);
    const at = new Date(first.getFullYear(), first.getMonth() + 1, 1);
    while (at <= TODAY) {
      marks.push({
        day: Math.round((at.getTime() - first.getTime()) / DAY),
        label: at.toLocaleDateString("en-US", { month: "short" }),
      });
      at.setMonth(at.getMonth() + 1);
    }
    return marks;
  }
  const step = days <= 12 ? 2 : days <= 28 ? 4 : days <= 70 ? 7 : 14;
  const marks: { day: number; label: string }[] = [];
  for (let day = days; day >= 0; day -= step)
    marks.unshift({ day, label: short(dateOf(student, day)) });
  return marks;
}

/** The scores to mark up the side: steps that suit the student's own range. */
function scoreMarks(values: number[]): number[] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, 20);
  const step = span <= 100 ? 20 : span <= 250 ? 50 : span <= 500 ? 100 : 200;
  const from = Math.max(400, Math.floor((low - step * 0.25) / step) * step);
  const to = Math.min(1600, Math.ceil((high + step * 0.25) / step) * step);
  const marks: number[] = [];
  for (let s = from; s <= to; s += step) marks.push(s);
  return marks;
}

function Graph({
  student,
  points,
  at,
  setAt,
}: {
  student: Student;
  points: Point[];
  /** The day being pointed at, as a place in `points`, or none. */
  at: number | null;
  setAt: (at: number | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!box.current) return;
    const watch = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    watch.observe(box.current);
    return () => watch.disconnect();
  }, []);

  const narrow = width < 520;
  const height = narrow ? 220 : 280;
  const pad = { left: 46, right: narrow ? 14 : 22, top: 30, bottom: 30 };
  const scores = useMemo(
    () => scoreMarks([...points.map((p) => p.total), ...student.exams.map((e) => e.score)]),
    [points, student]
  );
  const days = useMemo(() => dayMarks(student), [student]);
  const x = (day: number) =>
    pad.left + (day / student.days) * Math.max(0, width - pad.left - pad.right);
  const y = (score: number) =>
    pad.top +
    (1 - (score - scores[0]) / (scores[scores.length - 1] - scores[0])) *
      (height - pad.top - pad.bottom);
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.total)}`)
    .join("");
  const floor = height - pad.bottom;
  const area = `${line}L${x(points[points.length - 1].day)} ${floor}L${x(points[0].day)} ${floor}Z`;
  const shown = at === null ? null : points[at];
  const labelled = student.exams.length <= 6;

  const find = (e: PointerEvent<HTMLDivElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left;
    const day =
      ((e.clientX - left - pad.left) / Math.max(1, width - pad.left - pad.right)) * student.days;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.day - day) < Math.abs(points[best].day - day)) best = i;
    });
    setAt(best);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    const from = at ?? last;
    const to =
      e.key === "ArrowLeft"
        ? Math.max(0, from - 1)
        : e.key === "ArrowRight"
          ? Math.min(last, from + 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (to === null) return;
    e.preventDefault();
    setAt(to);
  };
  const told = shown ?? points[points.length - 1];

  return (
    <div
      ref={box}
      className={styles.graph}
      style={{ height }}
      role="slider"
      tabIndex={0}
      aria-label="Predicted score over time"
      aria-valuemin={0}
      aria-valuemax={points.length - 1}
      aria-valuenow={at ?? points.length - 1}
      aria-valuetext={`${long(dateOf(student, told.day))}: ${told.total}. Reading and Writing ${told.rw}, Math ${told.math}.`}
      onPointerMove={find}
      onPointerDown={find}
      onPointerLeave={(e) => e.pointerType === "mouse" && setAt(null)}
      onBlur={() => setAt(null)}
      onKeyDown={key}
    >
      {width > 0 && (
        <svg key={student.label} width={width} height={height} aria-hidden="true">
          <defs>
            <linearGradient id="kp-score-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--p2)" stopOpacity="0.34" />
              <stop offset="1" stopColor="var(--p2)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {scores.map((score) => (
            <g key={score}>
              <path className={styles.rule} d={`M${pad.left} ${y(score)}H${width - pad.right}`} />
              <text className={styles.mark} x={pad.left - 10} y={y(score) + 4.5} textAnchor="end">
                {score}
              </text>
            </g>
          ))}
          {days.map((mark, i) => (
            <text
              key={mark.day}
              className={styles.mark}
              x={x(mark.day)}
              y={height - 8}
              textAnchor={i === days.length - 1 && mark.day === student.days ? "end" : "middle"}
            >
              {/* on a narrow screen only every second or third mark is named, so they never touch */}
              {narrow && days.length > 5 && (days.length - 1 - i) % (days.length > 7 ? 3 : 2)
                ? ""
                : mark.label}
            </text>
          ))}
          <path className={styles.area} d={area} fill="url(#kp-score-fill)" />
          <path className={styles.line} d={line} pathLength={1} />
          {student.exams.map((exam) => (
            <g key={exam.day}>
              <rect
                className={styles.exam}
                x={x(exam.day) - 5.5}
                y={y(exam.score) - 5.5}
                width="11"
                height="11"
                rx="3"
              />
              {labelled && (
                <text
                  className={styles.examScore}
                  x={Math.max(pad.left + 16, x(exam.day))}
                  y={y(exam.score) - 12}
                  textAnchor="middle"
                >
                  {exam.score}
                </text>
              )}
            </g>
          ))}
          {shown && (
            <>
              <path className={styles.hair} d={`M${x(shown.day)} ${pad.top - 8}V${floor}`} />
              <circle className={styles.dot} cx={x(shown.day)} cy={y(shown.total)} r="6" />
            </>
          )}
        </svg>
      )}
    </div>
  );
}

export default function Progress({ student: key }: { student: StudentKey }) {
  const student: Student = STUDENTS[key];
  const points = useMemo(() => predict(student), [student]);
  const [at, setAt] = useState<number | null>(null);
  const [was, setWas] = useState(key);
  if (was !== key) {
    setWas(key);
    setAt(null);
  }
  const latest = points[points.length - 1];
  const first = points[0];
  // the day pointed at on the graph, if any: the score above the graph shows that day instead of today
  const shown = at === null ? latest : (points[at] ?? latest);
  const past = at !== null && shown !== latest;
  const moved = shown ? shown.total - first.total : 0;
  const examOn = past ? student.exams.find((e) => e.day === shown.day) : undefined;

  return (
    <div className={`${lib.library} ${styles.progress}`}>
      <section className={`${lib.glass} ${styles.score}`} aria-label="Predicted score">
        {student.testIn !== null && (
          <p className={styles.countdown}>
            <b>{student.testIn}</b> days to your SAT
            <span>{long(new Date(TODAY.getTime() + student.testIn * DAY))}</span>
          </p>
        )}

        {latest ? (
          <>
            <div className={styles.head}>
              <h2>
                {past
                  ? `Predicted score on ${long(dateOf(student, shown.day))}`
                  : "Predicted score"}
              </h2>
              <p className={styles.total}>{shown.total}</p>
              <p className={styles.moved}>
                {examOn ? (
                  <>
                    Full-length exam that day <b>{examOn.score}</b>
                  </>
                ) : moved === 0 ? (
                  <>The same as on {long(dateOf(student, first.day))}</>
                ) : (
                  <>
                    <b>
                      {moved > 0 ? "Up" : "Down"} {Math.abs(moved)}
                    </b>{" "}
                    since {long(dateOf(student, first.day))}
                  </>
                )}
              </p>
              <dl className={styles.sections}>
                <div>
                  <dt>Reading and Writing</dt>
                  <dd>{shown.rw}</dd>
                </div>
                <div>
                  <dt>Math</dt>
                  <dd>{shown.math}</dd>
                </div>
              </dl>
            </div>
            <Graph student={student} points={points} at={at} setAt={setAt} />
            <ul className={styles.legend}>
              <li>
                <i data-kind="line" />
                Predicted score
              </li>
              <li>
                <i data-kind="exam" />
                Full-length exam score
              </li>
            </ul>
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
    </div>
  );
}
