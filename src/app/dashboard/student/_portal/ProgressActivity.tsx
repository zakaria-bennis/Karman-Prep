"use client";

// Progress, step 2 (founder, 2026-11-15 and 2026-11-16): the numbers and the calendar.
//   Stats      the span is the predicted score's own: one setting for the whole page. Six numbers in his order: time invested, questions answered, skills Proficient,
//              pacing, days practiced, exams taken last. Accuracy is inside Questions answered. Exams taken has
//              no small line. Each is a button that opens the number's own
//              page. Each reads like a stock: what it stands at, a ticker of how far it moved over
//              the span chosen (none for all time), and a small line with a fading
//              fill. A line that rose is green and one that fell is red, for every number.
//   Calendar   one month at a time. Each day is a rounded square shaded by how much was done. Pressing
//              a day shows what was done that day, with the streak on the same line as the date.
//              Pressing the month's name opens the list of months; Today goes back in one press. The
//              streak counts days in a row with the Daily 10.
// A student is never compared with other students here. Time is active time only.
// Anything that changes on a press has its place kept, so nothing below it moves. Today and the day
// pressed are marked inside their own squares, so no square ever lies over its neighbor.
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./progressActivity.module.css";
import { DAY, TODAY, dateOf, streak, type DayLog, type Student } from "./progressData";
import { Spans, spanFor, type SpanKey } from "./ProgressGraph";
import { STATS, STAT_ORDER, clock, ledger, wayOf, type Stat, type StatKey } from "./progressStats";
import { tick } from "./sound";

/** A number's small stock line over the span shown, with a fill that fades out under it. */
export function Spark({
  values,
  way,
  flip = false,
}: {
  values: number[];
  way: "up" | "down" | "flat";
  /** Upside down, the lowest value at the top: for pacing, where getting faster should rise. */
  flip?: boolean;
}) {
  const id = useId();
  const w = 104;
  const h = 36;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const line = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const share = high === low ? 0.5 : (v - low) / (high - low);
      const y = 4 + (flip ? share : 1 - share) * (h - 8);
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
  wanted,
  onSpan,
  onStat,
}: {
  student: Student;
  logs: DayLog[];
  /** The span chosen on the predicted score: these numbers always show the same one. */
  wanted: SpanKey | null;
  onSpan: (span: SpanKey) => void;
  onStat: (stat: StatKey) => void;
}) {
  const book = useMemo(() => ledger(student, logs), [student, logs]);
  const period = spanFor(wanted, student.days);
  const to = student.days;
  const from = period.days === Infinity ? 0 : Math.max(0, to - period.days);
  return (
    <section className={`${lib.glass} ${styles.stats}`} aria-label="Activity">
      {/* the same choices as on the predicted score; choosing here moves both */}
      <Spans id="numbers-span" history={student.days} span={period} onPick={onSpan} />

      <ul className={styles.cells}>
        {STAT_ORDER.map((key) => {
          const stat: Stat = STATS[key];
          const series = book[key];
          const moved = series[to] - series[from];
          const way = wayOf(moved, stat.lessIsBetter);
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
                {/* a count of exams has no line worth drawing: its place is kept, empty */}
                {key !== "exams" && (
                  <Spark
                    values={thin(series.slice(from, to + 1))}
                    way={way === "flat" ? "up" : way}
                    flip={stat.lessIsBetter}
                  />
                )}
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthName = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export function Calendar({ student, logs }: { student: Student; logs: DayLog[] }) {
  const first = dateOf(student, 0);
  const [month, setMonth] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [picked, setPicked] = useState(student.days);
  const [listing, setListing] = useState(false);
  const head = useRef<HTMLElement>(null);
  const run = useMemo(() => streak(logs), [logs]);

  // the two days the calendar rings (founder, 2026-11-16), in the countdown badge's own colors: the
  // day of the SAT in ruby, and the day 30 days before it in gold. Counted as days of the log, so the
  // SAT's day lies past today.
  const satDay = student.testIn === null ? null : student.days + student.testIn;
  const thisMonth = useMemo(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), []);

  /** Every month the student has been here, the newest first, and on to the month of their SAT. */
  const months = useMemo(() => {
    const out: Date[] = [];
    const sat = satDay === null ? TODAY : dateOf(student, satDay);
    const at = new Date(
      Math.max(thisMonth.getTime(), new Date(sat.getFullYear(), sat.getMonth(), 1).getTime())
    );
    const stop = new Date(first.getFullYear(), first.getMonth(), 1);
    while (at >= stop) {
      out.push(new Date(at));
      at.setMonth(at.getMonth() - 1);
    }
    return out;
  }, [first, satDay, student, thisMonth]);

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
  /** A date in the month shown, counted as a day of the student's log (it may lie outside it). */
  const dayOf = (date: number) =>
    student.days -
    Math.round(
      (TODAY.getTime() - new Date(month.getFullYear(), month.getMonth(), date).getTime()) / DAY
    );
  /** The place in the student's log of a date in the month shown, or -1 if it is outside their time. */
  const logOf = (date: number) => {
    const day = dayOf(date);
    return day >= 0 && day <= student.days ? day : -1;
  };
  const markOf = (day: number) =>
    satDay === null
      ? undefined
      : day === satDay
        ? "sat"
        : day === satDay - 30
          ? "month"
          : undefined;
  const sameMonth = month.getTime() === thisMonth.getTime();
  // how many of the month's days that have come so far had practice on them
  const monthDays = Array.from({ length }, (_, i) => logOf(i + 1)).filter((day) => day >= 0);
  const practiced = monthDays.filter((day) => logs[day].questions > 0).length;
  const log = logs[picked];
  const improved = Math.min(log.sets, (log.day * 7) % 4);
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
        {/* back to today in one press; shown only when there is somewhere to come back from */}
        <button
          type="button"
          className={styles.today}
          data-idle={(sameMonth && picked === student.days) || undefined}
          tabIndex={sameMonth && picked === student.days ? -1 : 0}
          onClick={() => {
            setMonth(thisMonth);
            setPicked(student.days);
            tick();
          }}
        >
          Today
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

      {/* a month still to come has nothing to count; its line is kept, empty */}
      <p className={styles.tally}>
        {monthDays.length > 0 && (
          <>
            <b>{practiced}</b> of {monthDays.length} days practiced
          </>
        )}
      </p>

      <div className={styles.grid} role="group" aria-label="Days">
        {WEEKDAYS.map((name) => (
          <span key={name} className={styles.weekday} aria-hidden="true">
            {name}
          </span>
        ))}
        {Array.from({ length: length }, (_, i) => i + 1).map((date) => {
          const day = logOf(date);
          const done = day < 0 ? 0 : logs[day].questions;
          const level = done === 0 ? 0 : done <= 18 ? 1 : done <= 36 ? 2 : 3;
          const mark = markOf(dayOf(date));
          const marked =
            mark === "sat" ? ", your SAT" : mark === "month" ? ", 30 days to your SAT" : "";
          return (
            <button
              key={date}
              type="button"
              className={styles.day}
              style={date === 1 ? ({ gridColumnStart: lead + 1 } as CSSProperties) : undefined}
              data-level={level}
              data-out={day < 0 || undefined}
              data-today={day === student.days || undefined}
              data-mark={mark}
              title={marked ? marked.slice(2).replace(/^y/, "Y") : undefined}
              aria-pressed={day === picked && day >= 0}
              aria-label={`${month.toLocaleDateString("en-US", { month: "long" })} ${date}${day >= 0 ? `, ${done} questions` : ""}${marked}`}
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

      {/* what was done on the day pressed, with the streak on its first line. Its height is fixed, so
          pressing a day moves nothing. */}
      <div className={styles.detail} aria-live="polite">
        <div className={styles.detailHead}>
          <h3>
            {when.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
          </h3>
          <p className={styles.streak}>
            <Icon name="flame" size={18} />
            <b>{run}</b> day streak
          </p>
        </div>
        {log.questions === 0 ? (
          <p className={styles.none}>Nothing logged.</p>
        ) : (
          <dl>
            <div>
              <dd>{log.questions}</dd>
              <dt>questions</dt>
            </div>
            <div>
              <dd>{clock(log.minutes)}</dd>
              <dt>invested</dt>
            </div>
            <div>
              {/* how many skills went up a level that day (a stand-in until levels are logged) */}
              <dd>{improved}</dd>
              <dt>{improved === 1 ? "skill improved" : "skills improved"}</dt>
            </div>
          </dl>
        )}
        <p className={styles.examDay}>
          {log.exam > 0
            ? `Full-length exam ${log.exam}`
            : markOf(picked) === "month" && "30 days to your SAT"}
        </p>
      </div>
    </section>
  );
}
