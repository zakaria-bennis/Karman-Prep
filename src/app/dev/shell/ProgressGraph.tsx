"use client";

// The one graph Progress uses for everything that moves over time: the predicted score and each of
// the numbers beside it. It reads like a stock: a line with a fill that starts strong and fades out,
// green when it ended better than it began over the span shown and red when it ended worse (the color
// is --trend, set by the piece of glass it sits on).
//   Spans   7 days, 2 weeks, 1 month, 3 months, 6 months, 1 year, all time. One appears only once the
//           student has that much history; nothing is ever greyed out.
//   Graph   both axes fit what is shown. Pointing at, dragging along or arrowing through the line
//           reports the day to the caller, which shows that day's value above the graph: nothing
//           floats over it, and there is no key. Marked days (full-length exams) are small points
//           with a ring breathing out; the day being looked at is a gray dot.
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
import styles from "./progress.module.css";
import { DAY, TODAY, dateOf, long, short, type Student } from "./progressData";
import { tick } from "./sound";

/** The spans of time a graph can show. `said` follows the number on a ticker: "+150 all time",
 *  "−30 past 7 days". It is not a sentence (founder, 2026-11-15). */
export const SPANS = [
  { key: "7d", label: "7 days", brief: "7D", days: 7, said: "past 7 days" },
  { key: "2w", label: "2 weeks", brief: "2W", days: 14, said: "past 2 weeks" },
  { key: "1m", label: "1 month", brief: "1M", days: 30, said: "past month" },
  { key: "3m", label: "3 months", brief: "3M", days: 91, said: "past 3 months" },
  { key: "6m", label: "6 months", brief: "6M", days: 182, said: "past 6 months" },
  { key: "1y", label: "1 year", brief: "1Y", days: 365, said: "past year" },
  { key: "all", label: "All time", brief: "All", days: Infinity, said: "all time" },
] as const;
export type SpanKey = (typeof SPANS)[number]["key"];
export type Span = (typeof SPANS)[number];

/** The span to show: the one wanted if the student has that much history, otherwise all time. */
export const spanFor = (wanted: SpanKey, history: number): Span =>
  SPANS.find((s) => s.key === wanted && (s.days === Infinity || history >= s.days)) ??
  SPANS[SPANS.length - 1];

/** The bar of spans, with a lens on the chosen one. `id` keeps one bar's lens apart from another's. */
export function Spans({
  id,
  history,
  span,
  onPick,
}: {
  id: string;
  /** How many days of history there are: longer spans stay hidden until it reaches them. */
  history: number;
  span: Span;
  onPick: (key: SpanKey) => void;
}) {
  const still = useReducedMotion() ?? false;
  return (
    <div className={`${lib.filter} ${styles.spans}`} role="group" aria-label="Span of time">
      {SPANS.filter((s) => s.days === Infinity || history >= s.days).map((s) => (
        <button
          key={s.key}
          type="button"
          aria-label={s.label}
          aria-pressed={span.key === s.key}
          onClick={() => {
            onPick(s.key);
            tick();
          }}
        >
          {span.key === s.key && (
            <motion.span
              layoutId={id}
              className={lib.lens}
              transition={still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }}
            />
          )}
          <span>
            <span data-full>{s.label}</span>
            <span data-brief>{s.brief}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

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

/** Round numbers to mark up the side, in steps that suit the range shown (1, 2 or 5 times a power of
 *  ten), never finer than `finest` and never outside `least` to `most`. */
export function niceMarks(
  values: number[],
  { least = -Infinity, most = Infinity, finest = 1 } = {}
): number[] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const raw = Math.max(high - low, finest * 2) / 4;
  const size = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / size;
  const step = Math.max(finest, (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * size);
  const from = Math.max(least, Math.floor((low - step * 0.25) / step) * step);
  let to = Math.min(most, Math.ceil((high + step * 0.25) / step) * step);
  if (to <= from) to = from + step;
  const marks: number[] = [];
  for (let s = from; s <= to + step / 1000; s += step) marks.push(Math.round(s * 1000) / 1000);
  return marks;
}

export type Dot = { day: number; value: number };

export function Graph({
  student,
  from,
  points,
  ticks,
  format = String,
  marked = [],
  label,
  say,
  at,
  setAt,
}: {
  student: Student;
  /** The first day shown. */
  from: number;
  /** One point for every day shown, in order. */
  points: Dot[];
  /** The values to mark up the side, lowest first: they set the top and the foot of the graph. */
  ticks: number[];
  /** How a value up the side is written. */
  format?: (value: number) => string;
  /** Days to mark with a breathing point (full-length exams), at their own values. */
  marked?: Dot[];
  /** What the graph is of, for a screen reader. */
  label: string;
  /** What to say about one of the `points`, for a screen reader. */
  say: (index: number) => string;
  /** The day being pointed at, as a place in `points`, or none. */
  at: number | null;
  setAt: (at: number | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tall, setTall] = useState(0);
  useEffect(() => {
    if (!box.current) return;
    // the graph takes whatever height its piece of glass has left over, never less than its own
    const watch = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
      setTall(Math.round(entry.contentRect.height));
    });
    watch.observe(box.current);
    return () => watch.disconnect();
  }, []);

  const narrow = width < 520;
  const least = narrow ? 210 : 270;
  const height = Math.max(least, tall);
  const pad = { left: 46, right: narrow ? 14 : 22, top: 30, bottom: 30 };
  const inner = Math.max(1, width - pad.left - pad.right);
  const days = useMemo(() => dayMarks(student, from), [student, from]);
  const x = (day: number) => pad.left + ((day - from) / Math.max(1, student.days - from)) * inner;
  const y = (value: number) =>
    pad.top +
    (1 - (value - ticks[0]) / (ticks[ticks.length - 1] - ticks[0])) *
      (height - pad.top - pad.bottom);
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join("");
  const floor = height - pad.bottom;
  const area = `${line}L${x(points[points.length - 1].day)} ${floor}L${x(points[0].day)} ${floor}Z`;
  const shown = at === null ? null : (points[at] ?? null);
  // name only as many days as fit: about 62 pixels each
  const skip = Math.max(1, Math.ceil((days.length * 62) / inner));

  const find = (e: PointerEvent<HTMLDivElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left;
    const day = from + ((e.clientX - left - pad.left) / inner) * (student.days - from);
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

  return (
    <div
      ref={box}
      className={styles.graph}
      style={{ minHeight: least }}
      role="slider"
      tabIndex={0}
      aria-label={`${label} over time`}
      aria-valuemin={0}
      aria-valuemax={points.length - 1}
      aria-valuenow={at ?? points.length - 1}
      aria-valuetext={`${long(dateOf(student, (shown ?? points[points.length - 1]).day))}: ${say(at ?? points.length - 1)}`}
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
          key={`${student.label} ${label} ${from}`}
          width={width}
          height={height}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="kp-graph-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--trend)" stopOpacity="0.36" />
              <stop offset="1" stopColor="var(--trend)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((value) => (
            <g key={value}>
              <path className={styles.rule} d={`M${pad.left} ${y(value)}H${width - pad.right}`} />
              <text className={styles.mark} x={pad.left - 10} y={y(value) + 4.5} textAnchor="end">
                {format(value)}
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
              {(days.length - 1 - i) % skip ? "" : mark.label}
            </text>
          ))}
          <path className={styles.area} d={area} fill="url(#kp-graph-fill)" />
          <path className={styles.line} d={line} pathLength={1} />
          {marked.map((mark, i) => (
            <g key={mark.day}>
              <circle
                className={styles.ring}
                style={{ "--lag": `${(i % 4) * -0.6}s` } as CSSProperties}
                cx={x(mark.day)}
                cy={y(mark.value)}
                r="3.500"
              />
              <circle className={styles.exam} cx={x(mark.day)} cy={y(mark.value)} r="3.500" />
              {marked.length <= 6 && (
                <text
                  className={styles.examScore}
                  x={Math.max(pad.left + 16, x(mark.day))}
                  y={y(mark.value) - 11}
                  textAnchor="middle"
                >
                  {format(mark.value)}
                </text>
              )}
            </g>
          ))}
          {shown && (
            <>
              <path className={styles.hair} d={`M${x(shown.day)} ${pad.top - 8}V${floor}`} />
              <circle className={styles.dot} cx={x(shown.day)} cy={y(shown.value)} r="5" />
            </>
          )}
        </svg>
      )}
    </div>
  );
}
