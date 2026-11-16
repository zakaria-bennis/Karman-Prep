"use client";

// Progress, step 1 of 6 (founder, 2026-11-15): the predicted score, first and centered. It reads like a
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
//   - The countdown shows only when the student has entered a test date.
// Every number is a stand-in: no student data is read. The demo bar switches between four made-up
// students so the scaling can be seen.
import { motion, useReducedMotion } from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import lib from "./library.module.css";
import { GoButton, Tile } from "./practice";
import styles from "./progress.module.css";
import { tick } from "./sound";

/** The day the stand-ins call today, fixed so the server and the browser draw the same page. */
const TODAY = new Date(2026, 10, 15);
const DAY = 86_400_000;
const round10 = (n: number) => Math.round(n / 10) * 10;

type Exam = { day: number; score: number };
type Student = {
  label: string;
  /** Days since they began. */
  days: number;
  exams: readonly Exam[];
  /** Turns in the prediction between exams (stand-in data only). */
  turns?: readonly Exam[];
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
  // this one slipped in the last week, so the 7-day span shows red
  weeks9: {
    label: "9 weeks",
    days: 63,
    exams: [
      { day: 3, score: 1200 },
      { day: 14, score: 1230 },
      { day: 28, score: 1290 },
      { day: 42, score: 1320 },
      { day: 52, score: 1370 },
    ],
    turns: [{ day: 56, score: 1410 }],
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

type Series = "total" | "rw" | "math";
const NAMES: Record<Series, string> = {
  total: "Predicted score",
  rw: "Predicted Reading and Writing score",
  math: "Predicted Math score",
};
const CHIPS: Record<Series, string> = { total: "Total", rw: "Reading and Writing", math: "Math" };

type Point = { day: number } & Record<Series, number>;

/** A total split into its two sections (stand-in arithmetic). */
const split = (day: number, total: number): Point => {
  const math = round10(total * (0.51 + 0.015 * Math.sin(day / 9)));
  return { day, total, math, rw: total - math };
};

/** The line for every day from the first exam to today. A prediction needs two exams, but once the
 *  second is taken the line is drawn back to the first, the student's starting point, so no part of
 *  the graph is empty. Between exams it rises and dips with practice (stand-in texture), in tens. */
function predict(student: Student): Point[] {
  const { exams, days, now } = student;
  if (exams.length < 2) return [];
  const marks = [...exams, ...(student.turns ?? []), { day: days, score: now }].sort(
    (a, b) => a.day - b.day
  );
  const points: Point[] = [];
  for (let day = exams[0].day; day <= days; day++) {
    const next = marks.findIndex((m) => m.day >= day);
    const a = marks[Math.max(0, next - 1)];
    const b = marks[next];
    const t = b.day === a.day ? 1 : (day - a.day) / (b.day - a.day);
    const wobble = day === days ? 0 : Math.sin(day * 0.9) * 4 + Math.sin(day * 0.31) * 5;
    points.push(split(day, round10(a.score + (b.score - a.score) * t + wobble)));
  }
  return points;
}

const dateOf = (student: Student, day: number) =>
  new Date(TODAY.getTime() - (student.days - day) * DAY);
const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const long = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

/** The spans of time the graph can show. `said` follows the number on the ticker: "+150 all time",
 *  "−30 past 7 days". It is not a sentence (founder, 2026-11-15). */
const SPANS = [
  { key: "7d", label: "7 days", brief: "7D", days: 7, said: "past 7 days" },
  { key: "2w", label: "2 weeks", brief: "2W", days: 14, said: "past 2 weeks" },
  { key: "1m", label: "1 month", brief: "1M", days: 30, said: "past month" },
  { key: "3m", label: "3 months", brief: "3M", days: 91, said: "past 3 months" },
  { key: "6m", label: "6 months", brief: "6M", days: 182, said: "past 6 months" },
  { key: "1y", label: "1 year", brief: "1Y", days: 365, said: "past year" },
  { key: "all", label: "All time", brief: "All", days: Infinity, said: "all time" },
] as const;
type SpanKey = (typeof SPANS)[number]["key"];

/** Marks along the days shown: days for a week or two, weeks for a couple of months, then months. */
function dayMarks(student: Student, from: number): { day: number; label: string }[] {
  const { days } = student;
  const span = days - from;
  const marks: { day: number; label: string }[] = [];
  if (span > 100) {
    const first = dateOf(student, 0);
    const start = dateOf(student, from);
    const at = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (at <= TODAY) {
      marks.push({
        day: Math.round((at.getTime() - first.getTime()) / DAY),
        label: at.toLocaleDateString("en-US", { month: "short" }),
      });
      at.setMonth(at.getMonth() + 1);
    }
    return marks;
  }
  const step = span <= 8 ? 1 : span <= 16 ? 2 : span <= 32 ? 4 : span <= 70 ? 7 : 14;
  for (let day = days; day >= from; day -= step)
    marks.unshift({ day, label: short(dateOf(student, day)) });
  return marks;
}

/** The scores to mark up the side: steps that suit the range being shown. */
function scoreMarks(values: number[], series: Series): number[] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, 20);
  const step = span <= 40 ? 10 : span <= 100 ? 20 : span <= 250 ? 50 : span <= 500 ? 100 : 200;
  const [least, most] = series === "total" ? [400, 1600] : [200, 800];
  const from = Math.max(least, Math.floor((low - step * 0.25) / step) * step);
  const to = Math.min(most, Math.ceil((high + step * 0.25) / step) * step);
  const marks: number[] = [];
  for (let s = from; s <= to; s += step) marks.push(s);
  return marks;
}

function Graph({
  student,
  series,
  from,
  points,
  at,
  setAt,
}: {
  student: Student;
  series: Series;
  /** The first day shown. */
  from: number;
  /** The days shown, in order. */
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
  const height = narrow ? 210 : 270;
  const pad = { left: 46, right: narrow ? 14 : 22, top: 30, bottom: 30 };
  const exams = useMemo(
    () => student.exams.filter((e) => e.day >= from).map((e) => split(e.day, e.score)),
    [student, from]
  );
  const scores = useMemo(
    () =>
      scoreMarks(
        [...points, ...exams].map((p) => p[series]),
        series
      ),
    [points, exams, series]
  );
  const days = useMemo(() => dayMarks(student, from), [student, from]);
  const x = (day: number) =>
    pad.left +
    ((day - from) / Math.max(1, student.days - from)) * Math.max(0, width - pad.left - pad.right);
  const y = (score: number) =>
    pad.top +
    (1 - (score - scores[0]) / (scores[scores.length - 1] - scores[0])) *
      (height - pad.top - pad.bottom);
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p[series])}`)
    .join("");
  const floor = height - pad.bottom;
  const area = `${line}L${x(points[points.length - 1].day)} ${floor}L${x(points[0].day)} ${floor}Z`;
  const shown = at === null ? null : (points[at] ?? null);
  const labelled = exams.length <= 6;
  const skip = narrow ? (days.length > 7 ? 3 : days.length > 4 ? 2 : 1) : 1;

  const find = (e: PointerEvent<HTMLDivElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left;
    const day =
      from +
      ((e.clientX - left - pad.left) / Math.max(1, width - pad.left - pad.right)) *
        (student.days - from);
    // there is one point a day, so the nearest one is found by counting, not by searching
    setAt(Math.min(points.length - 1, Math.max(0, Math.round(day - points[0].day))));
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    const here = at ?? last;
    const to =
      e.key === "ArrowLeft"
        ? Math.max(0, here - 1)
        : e.key === "ArrowRight"
          ? Math.min(last, here + 1)
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
      aria-label={`${NAMES[series]} over time`}
      aria-valuemin={0}
      aria-valuemax={points.length - 1}
      aria-valuenow={at ?? points.length - 1}
      aria-valuetext={`${long(dateOf(student, told.day))}: ${told.total}. Reading and Writing ${told.rw}, Math ${told.math}.`}
      onPointerMove={find}
      onPointerDown={(e) => {
        // a finger keeps hold of the graph even if it strays above or below it
        e.currentTarget.setPointerCapture(e.pointerId);
        find(e);
      }}
      onPointerUp={(e) => e.pointerType !== "mouse" && setAt(null)}
      onPointerCancel={() => setAt(null)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setAt(null)}
      onBlur={() => setAt(null)}
      onKeyDown={key}
    >
      {width > 0 && (
        <svg
          key={`${student.label} ${series} ${from}`}
          width={width}
          height={height}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="kp-score-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--trend)" stopOpacity="0.36" />
              <stop offset="1" stopColor="var(--trend)" stopOpacity="0" />
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
              textAnchor={
                mark.day === student.days ? "end" : mark.day === from ? "start" : "middle"
              }
            >
              {/* with little room only every second or third mark is named, so they never touch */}
              {(days.length - 1 - i) % skip ? "" : mark.label}
            </text>
          ))}
          <path className={styles.area} d={area} fill="url(#kp-score-fill)" />
          <path className={styles.line} d={line} pathLength={1} />
          {exams.map((exam, i) => (
            <g key={exam.day}>
              {/* a full-length exam at its real score: a point, and a ring breathing out from it */}
              <circle
                className={styles.ring}
                style={{ "--lag": `${(i % 4) * -0.6}s` } as CSSProperties}
                cx={x(exam.day)}
                cy={y(exam[series])}
                r="3.500"
              />
              <circle className={styles.exam} cx={x(exam.day)} cy={y(exam[series])} r="3.500" />
              {labelled && (
                <text
                  className={styles.examScore}
                  x={Math.max(pad.left + 16, x(exam.day))}
                  y={y(exam[series]) - 11}
                  textAnchor="middle"
                >
                  {exam[series]}
                </text>
              )}
            </g>
          ))}
          {shown && (
            <>
              <path className={styles.hair} d={`M${x(shown.day)} ${pad.top - 8}V${floor}`} />
              <circle className={styles.dot} cx={x(shown.day)} cy={y(shown[series])} r="5" />
            </>
          )}
        </svg>
      )}
    </div>
  );
}

export default function Progress({ student: key }: { student: StudentKey }) {
  const still = useReducedMotion() ?? false;
  const student: Student = STUDENTS[key];
  const all = useMemo(() => predict(student), [student]);
  const [series, setSeries] = useState<Series>("total");
  const [wanted, setWanted] = useState<SpanKey>("all");
  const [at, setAt] = useState<number | null>(null);
  const [was, setWas] = useState(key);
  if (was !== key) {
    setWas(key);
    setAt(null);
    setWanted("all");
  }

  // a span is offered only once the student has studied that long: the choices grow with them
  const history = all.length ? student.days - all[0].day : 0;
  const open = (days: number) => days === Infinity || history >= days;
  const span = SPANS.find((s) => s.key === wanted && open(s.days)) ?? SPANS[SPANS.length - 1];
  const from = span.days === Infinity ? (all[0]?.day ?? 0) : student.days - span.days;
  const points = useMemo(() => all.filter((p) => p.day >= from), [all, from]);
  const latest = points[points.length - 1];
  const first = points[0];
  // the day pointed at on the graph, if any: the number above shows that day instead of today
  const shown = at === null ? latest : (points[at] ?? latest);
  const past = shown !== latest;
  const moved = shown ? shown[series] - first[series] : 0;
  const fell = latest ? latest[series] < first[series] : false;
  const examOn = past ? student.exams.find((e) => e.day === shown.day) : undefined;
  const since = first ? `since ${short(dateOf(student, first.day))}` : "";
  const choose = (next: Series) => {
    setSeries(next);
    setAt(null);
    tick();
  };

  return (
    <div className={`${lib.library} ${styles.progress}`}>
      <section
        className={`${lib.glass} ${styles.score}`}
        aria-label="Predicted score"
        data-trend={fell ? "down" : "up"}
      >
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
                {NAMES[series]}
                {past && ` on ${long(dateOf(student, shown.day))}`}
              </h2>
              <p className={styles.total}>{shown[series]}</p>
              {/* the ticker: how far it has moved over the span, with a sign, green up and red down */}
              <p
                className={styles.ticker}
                data-way={moved > 0 ? "up" : moved < 0 ? "down" : "flat"}
              >
                {moved > 0 ? "+" : moved < 0 ? "−" : ""}
                {Math.abs(moved)} {past ? since : span.said}
                {examOn && (
                  <span>
                    Full-length exam that day <b>{split(examOn.day, examOn.score)[series]}</b>
                  </span>
                )}
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

            <div className={`${lib.filter} ${styles.spans}`} role="group" aria-label="Span of time">
              {SPANS.filter((s) => open(s.days)).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-label={s.label}
                  aria-pressed={span.key === s.key}
                  onClick={() => {
                    setWanted(s.key);
                    setAt(null);
                    tick();
                  }}
                >
                  {span.key === s.key && (
                    <motion.span
                      layoutId="progress-span"
                      className={lib.lens}
                      transition={
                        still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                      }
                    />
                  )}
                  <span>
                    <span data-full>{s.label}</span>
                    <span data-brief>{s.brief}</span>
                  </span>
                </button>
              ))}
            </div>

            <Graph
              student={student}
              series={series}
              from={from}
              points={points}
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
    </div>
  );
}
