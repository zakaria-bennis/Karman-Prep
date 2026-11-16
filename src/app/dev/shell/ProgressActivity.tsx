"use client";

// Progress, step 2 (founder, 2026-11-15): the six numbers and the calendar.
//   Stats      questions answered, time invested, days practiced, accuracy, skills Proficient and exams
//              taken. All time by default, with a switch to 30 days and 7 days. On a shorter span each
//              number carries a ticker: how it compares with the span before, green up and red down.
//              Accuracy always shows today's percent, with a small line of how it has moved.
//   Calendar   one month at a time. Each day is a rounded square shaded by how much was done. Pressing
//              a day shows what was done that day. The streak counts days in a row with the Daily 10.
// A student is never compared with other students here. Time is active time only.
// Anything that changes on a press has its place kept, so nothing below it moves.
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState, type CSSProperties } from "react";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./progressActivity.module.css";
import {
  DAY,
  SKILLS,
  TODAY,
  dateOf,
  proficientBy,
  streak,
  sumOver,
  type DayLog,
  type Student,
} from "./progressData";
import { tick } from "./sound";

const SLIDE = { type: "spring", stiffness: 520, damping: 34 } as const;
const STILL = { duration: 0 } as const;

const PERIODS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: Infinity },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const clock = (minutes: number) =>
  minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

/** A small line of accuracy over the days shown: each point is the week ending on that day. It takes
 *  the ticker's color when there is one, so the two never disagree. */
function Spark({
  logs,
  from,
  to,
  moved,
}: {
  logs: DayLog[];
  from: number;
  to: number;
  moved: number | null;
}) {
  const values = useMemo(() => {
    const out: number[] = [];
    const start = Math.max(from, 6);
    const step = Math.max(1, Math.round((to - start) / 16));
    for (let day = to; day >= start; day -= step) out.unshift(sumOver(logs, day - 6, day).accuracy);
    if (out.length < 2) out.unshift(out[0] ?? 0);
    return out;
  }, [logs, from, to]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const w = 120;
  const h = 30;
  const d = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = 3 + (1 - (v - low) / Math.max(1, high - low)) * (h - 6);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
  return (
    <svg
      className={styles.spark}
      data-way={(moved ?? values[values.length - 1] - values[0]) < 0 ? "down" : "up"}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} pathLength={1} />
    </svg>
  );
}

export function Stats({ student, logs }: { student: Student; logs: DayLog[] }) {
  const still = useReducedMotion() ?? false;
  const [wanted, setWanted] = useState<PeriodKey>("all");
  const period = PERIODS.find((p) => p.key === wanted) ?? PERIODS[2];
  const to = student.days;
  const from = period.days === Infinity ? 0 : to - period.days + 1;
  const now = sumOver(logs, from, to);
  // the span just before this one, to compare with (none for all time)
  const before = period.days === Infinity ? null : sumOver(logs, from - period.days, from - 1);
  const cells: { value: string; label: string; moved: number | null }[] = [
    {
      value: now.questions.toLocaleString("en-US"),
      label: "questions answered",
      moved: before && now.questions - before.questions,
    },
    {
      value: clock(now.minutes),
      label: "invested",
      moved: before && Math.round((now.minutes - before.minutes) / 6) / 10,
    },
    {
      value: String(now.practiced),
      label: "days practiced",
      moved: before && now.practiced - before.practiced,
    },
    {
      value: `${proficientBy(to)}`,
      label: `of ${SKILLS} skills Proficient`,
      moved: before && now.proficient,
    },
    { value: String(now.exams), label: "exams taken", moved: before && now.exams - before.exams },
  ];
  return (
    <section className={`${lib.glass} ${styles.stats}`} aria-label="Activity">
      <div className={`${lib.filter} ${styles.periods}`} role="group" aria-label="Span of time">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={period.key === p.key}
            onClick={() => {
              setWanted(p.key);
              tick();
            }}
          >
            {period.key === p.key && (
              <motion.span
                layoutId="progress-period"
                className={lib.lens}
                transition={still ? STILL : SLIDE}
              />
            )}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* accuracy leads: the percent right now, how it compares, and a small line of how it has moved */}
      <div className={styles.accuracy}>
        <p className={styles.figure}>
          <b>{now.accuracy}%</b>
          accuracy
          <Tick moved={before && now.accuracy - before.accuracy} />
        </p>
        <Spark logs={logs} from={from} to={to} moved={before && now.accuracy - before.accuracy} />
      </div>

      <ul className={styles.cells}>
        {cells.map((cell) => (
          <li key={cell.label} className={styles.figure}>
            <b>{cell.value}</b>
            {cell.label}
            <Tick moved={cell.moved} hours={cell.label === "invested"} />
          </li>
        ))}
      </ul>

      {/* always there, so choosing a span never moves anything */}
      <p className={styles.note}>
        {period.days === Infinity ? "" : `Colored numbers compare with the ${period.label} before.`}
      </p>
    </section>
  );
}

/** A stat's ticker: how it compares with the span before. Its place is kept when there is none. */
function Tick({ moved, hours }: { moved: number | null; hours?: boolean }) {
  return (
    <span
      className={styles.tick}
      data-way={moved === null || moved === 0 ? "flat" : moved > 0 ? "up" : "down"}
    >
      {moved === null ? "" : moved === 0 ? "no change" : `${signed(moved)}${hours ? "h" : ""}`}
    </span>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function Calendar({ student, logs }: { student: Student; logs: DayLog[] }) {
  const first = dateOf(student, 0);
  const [month, setMonth] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [picked, setPicked] = useState(student.days);
  const run = useMemo(() => streak(logs), [logs]);

  const lead = month.getDay();
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const canBack = month > new Date(first.getFullYear(), first.getMonth(), 1);
  const canNext = month < new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const turn = (by: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
    tick();
  };
  /** The place in the student's log of a date in the month shown, or -1 if it is outside their time. */
  const logOf = (date: number) => {
    const at = new Date(month.getFullYear(), month.getMonth(), date);
    const day = student.days - Math.round((TODAY.getTime() - at.getTime()) / DAY);
    return day >= 0 && day <= student.days ? day : -1;
  };
  const log = logs[picked];
  const when = dateOf(student, picked);

  return (
    <section className={`${lib.glass} ${styles.calendar}`} aria-label="Calendar">
      <header>
        <h2>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <button
          type="button"
          aria-label="Month before"
          disabled={!canBack}
          onClick={() => turn(-1)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M14.500 6.500L9 12l5.500 5.500" />
          </svg>
        </button>
        <button type="button" aria-label="Month after" disabled={!canNext} onClick={() => turn(1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
          </svg>
        </button>
      </header>

      <div className={styles.grid} role="group" aria-label="Days">
        {WEEKDAYS.map((name, i) => (
          <span key={i} className={styles.weekday} aria-hidden="true">
            {name}
          </span>
        ))}
        {Array.from({ length: length }, (_, i) => i + 1).map((date) => {
          const day = logOf(date);
          const done = day < 0 ? 0 : logs[day].questions;
          const level = done === 0 ? 0 : done <= 18 ? 1 : done <= 36 ? 2 : 3;
          return (
            <button
              key={date}
              type="button"
              className={styles.day}
              style={date === 1 ? ({ gridColumnStart: lead + 1 } as CSSProperties) : undefined}
              data-level={level}
              data-today={day === student.days || undefined}
              aria-pressed={day === picked && day >= 0}
              aria-label={`${month.toLocaleDateString("en-US", { month: "long" })} ${date}${day >= 0 ? `, ${done} questions` : ""}`}
              disabled={day < 0}
              onClick={() => {
                setPicked(day);
                tick();
              }}
            >
              {date}
            </button>
          );
        })}
      </div>

      {/* what was done on the day pressed. Its height is fixed, so pressing a day moves nothing. */}
      <div className={styles.detail} aria-live="polite">
        <h3>
          {when.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </h3>
        {log.questions === 0 ? (
          <p>Nothing logged.</p>
        ) : (
          <>
            <p>
              <b>{log.questions}</b> questions <b>{clock(log.minutes)}</b>{" "}
              <b>{Math.round((log.correct / log.questions) * 100)}%</b> correct
            </p>
            <p>
              {[log.daily10 && "Daily 10", log.exam > 0 && `Full-length exam ${log.exam}`]
                .filter(Boolean)
                .join(", ")}
            </p>
          </>
        )}
      </div>

      <p className={styles.streak}>
        <Icon name="flame" size={20} />
        <b>{run}</b> day streak
        <span>A day counts when you finish the Daily 10.</span>
      </p>
    </section>
  );
}
