"use client";

// Progress, step 2 (founder, 2026-11-15 and 2026-11-16): the numbers and the calendar.
//   Stats      seven numbers in his order: time invested, questions answered, skills Proficient, exams
//              taken, pacing, accuracy, days practiced. Each is a button that opens the number's own
//              page. Each reads like a stock: what it stands at, a ticker of how far it moved over
//              the span chosen (7 days, 30 days; none for all time), and a small line with a fading
//              fill. Green is for the better and red for the worse; for pacing, faster is better.
//   Calendar   one month at a time. Each day is a rounded square shaded by how much was done. Pressing
//              a day shows what was done that day. Pressing the month's name opens the list of months.
//              The streak counts days in a row with the Daily 10.
// A student is never compared with other students here. Time is active time only.
// Anything that changes on a press has its place kept, so nothing below it moves. Today and the day
// pressed are marked inside their own squares, so no square ever lies over its neighbor.
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./progressActivity.module.css";
import { DAY, TODAY, dateOf, streak, type DayLog, type Student } from "./progressData";
import { STATS, STAT_ORDER, clock, ledger, wayOf, type Stat, type StatKey } from "./progressStats";
import { tick } from "./sound";

const SLIDE = { type: "spring", stiffness: 520, damping: 34 } as const;
const STILL = { duration: 0 } as const;

const PERIODS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: Infinity },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

/** A number's small stock line over the span shown, with a fill that fades out under it. */
function Spark({ values, way }: { values: number[]; way: "up" | "down" | "flat" }) {
  const id = useId();
  const w = 104;
  const h = 36;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const line = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = 4 + (1 - (high === low ? 0.5 : (v - low) / (high - low))) * (h - 8);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
  return (
    <svg className={styles.spark} data-way={way} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--way)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--way)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${w} ${h}L0 ${h}Z`} fill={`url(#${id})`} stroke="none" />
      <path d={line} pathLength={1} />
    </svg>
  );
}

/** At most `most` values from a run, evenly spaced, always ending on the last one. */
const thin = (values: number[], most = 30) => {
  if (values.length <= most) return values;
  const step = (values.length - 1) / (most - 1);
  return Array.from({ length: most }, (_, i) => values[Math.round(i * step)]);
};

export function Stats({
  student,
  logs,
  onStat,
}: {
  student: Student;
  logs: DayLog[];
  onStat: (stat: StatKey) => void;
}) {
  const still = useReducedMotion() ?? false;
  const book = useMemo(() => ledger(student, logs), [student, logs]);
  const [wanted, setWanted] = useState<PeriodKey>("all");
  const period = PERIODS.find((p) => p.key === wanted) ?? PERIODS[2];
  const to = student.days;
  const from = period.days === Infinity ? 0 : Math.max(0, to - period.days);
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

      <ul className={styles.cells}>
        {STAT_ORDER.map((key) => {
          const stat: Stat = STATS[key];
          const series = book[key];
          const moved = series[to] - series[from];
          const way = wayOf(stat, moved);
          return (
            <li key={key}>
              <button
                type="button"
                className={styles.stat}
                onClick={() => {
                  tick();
                  onStat(key);
                }}
              >
                <span className={styles.name}>{stat.name}</span>
                <span className={styles.value}>
                  {stat.show(series[to])}
                  {stat.after && <small>{stat.after}</small>}
                </span>
                {/* the ticker's place is kept for all time, when there is nothing to compare */}
                <span className={styles.tick} data-way={way}>
                  {period.days === Infinity ? "" : moved === 0 ? "no change" : stat.moved(moved)}
                </span>
                <Spark
                  values={thin(series.slice(from, to + 1))}
                  way={way === "flat" ? "up" : way}
                />
                <svg
                  className={styles.chev}
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  aria-hidden="true"
                >
                  <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const monthName = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export function Calendar({ student, logs }: { student: Student; logs: DayLog[] }) {
  const first = dateOf(student, 0);
  const [month, setMonth] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [picked, setPicked] = useState(student.days);
  const [listing, setListing] = useState(false);
  const head = useRef<HTMLElement>(null);
  const run = useMemo(() => streak(logs), [logs]);

  /** Every month the student has been here, the newest first. */
  const months = useMemo(() => {
    const out: Date[] = [];
    const at = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    const stop = new Date(first.getFullYear(), first.getMonth(), 1);
    while (at >= stop) {
      out.push(new Date(at));
      at.setMonth(at.getMonth() - 1);
    }
    return out;
  }, [first]);

  useEffect(() => {
    if (!listing) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setListing(false);
    const away = (e: PointerEvent) => {
      if (!head.current?.contains(e.target as Node)) setListing(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", away);
    };
  }, [listing]);

  const lead = month.getDay();
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const canBack = month > months[months.length - 1];
  const canNext = month < months[0];
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
      <header ref={head}>
        {/* the month's name opens the list of months, for going further back in one press */}
        <button
          type="button"
          className={styles.month}
          aria-haspopup="listbox"
          aria-expanded={listing}
          onClick={() => {
            setListing(!listing);
            tick();
          }}
        >
          <h2>{monthName(month)}</h2>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6.500 9.500L12 15l5.500-5.500" />
          </svg>
        </button>
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
        {listing && (
          <ul className={styles.months} role="listbox" aria-label="Month">
            {months.map((m) => (
              <li key={m.getTime()} role="option" aria-selected={m.getTime() === month.getTime()}>
                <button
                  type="button"
                  onClick={() => {
                    setMonth(m);
                    setListing(false);
                    tick();
                  }}
                >
                  {monthName(m)}
                </button>
              </li>
            ))}
          </ul>
        )}
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
