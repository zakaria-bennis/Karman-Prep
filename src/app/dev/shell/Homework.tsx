"use client";

// Homework: where a Cohort or Private student lands (founder, 2026-11-16; the rules are in
// homeworkData.ts). The week is laid out a day beside a day. A day lists only what is still to do,
// each piece a pane of shaded glass in its subject's color (fuchsia, blue, green; no key). The exam
// leads Saturday and is made much of. At the foot of a day, still inside its glass, a Completed
// button opens what has been done.
// With room, the seven days stand side by side, all one height. On a phone the seven days are a
// strip, each with its work as dots in three tidy rows (Reading and Writing, Math, Mixed), and the
// day pressed is shown under it, named where "Today" is.
// Pressing a piece of work leads nowhere yet: each activity's beginning screen is still to come.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import {
  KINDS,
  WEEK_NOW,
  WEEKS,
  weekOf,
  type HomeworkDay,
  type Kind,
  type Work,
} from "./homeworkData";
import styles from "./homework.module.css";
import lib from "./library.module.css";
import { tick } from "./sound";

const STATE: Record<Work["state"], string> = {
  todo: "",
  done: "Done",
  missing: "Missing",
  closed: "Closed",
};

function Item({ work }: { work: Work }) {
  return (
    <li>
      <button
        type="button"
        className={styles.work}
        data-kind={work.kind}
        data-state={work.state}
        data-exam={work.exam || undefined}
        disabled={work.state === "closed"}
        aria-label={`${work.name}, ${KINDS[work.kind]}, ${work.what}${
          STATE[work.state] ? `, ${STATE[work.state]}` : ""
        }`}
        onClick={() => tick()}
      >
        <span>
          <b>{work.name}</b>
          <small>{work.what}</small>
        </span>
        {work.state === "done" ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M5.500 12.500l4.200 4.200L18.500 8" />
          </svg>
        ) : (
          work.state !== "todo" && <em>{STATE[work.state]}</em>
        )}
      </button>
    </li>
  );
}

function Day({ day, wide }: { day: HomeworkDay; wide: boolean }) {
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const left = day.work.filter((w) => w.state !== "done");
  const done = day.work.filter((w) => w.state === "done");
  return (
    <section
      className={`${lib.glass} ${styles.day}`}
      data-today={day.from === 0 || undefined}
      aria-label={day.date.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })}
    >
      <header>
        <h3>
          {day.from === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "long" })}
        </h3>
        {/* with seven days side by side, each says its date; a phone's strip already does */}
        {wide && (
          <span>{day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        )}
      </header>
      {day.class && <p className={styles.class}>Class at {day.class}</p>}
      {left.length > 0 ? (
        <ul>
          {left.map((work) => (
            <Item key={work.id} work={work} />
          ))}
        </ul>
      ) : (
        <p className={styles.clear}>All done</p>
      )}
      {done.length > 0 && (
        <div className={styles.done}>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul
                initial={still ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={still ? undefined : { height: 0, opacity: 0 }}
                transition={
                  still ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }
                }
              >
                {done.map((work) => (
                  <Item key={work.id} work={work} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          <button
            type="button"
            className={styles.completed}
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
              tick();
            }}
          >
            Completed <b>{done.length}</b>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6.500 14.500L12 9l5.500 5.500" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}

export default function Homework({ rail }: { rail: boolean }) {
  const still = useReducedMotion() ?? false;
  const [week, setWeek] = useState(0);
  const days = weekOf(week);
  const today = days.findIndex((d) => d.from === 0);
  const [picked, setPicked] = useState(today < 0 ? 0 : today);
  const span = `${days[0].date.toLocaleDateString("en-US", { month: "long", day: "numeric" })} to ${days[6].date.toLocaleDateString(
    "en-US",
    days[6].date.getMonth() === days[0].date.getMonth()
      ? { day: "numeric" }
      : { month: "long", day: "numeric" }
  )}`;
  const step = (by: number) => {
    setWeek(week + by);
    tick();
  };
  const shown = rail ? days : [days[picked]];

  return (
    <div className={`${lib.library} ${styles.homework}`}>
      <div className={`${lib.glass} ${styles.top}`} role="group" aria-label="Week">
        <button
          type="button"
          className={styles.arrow}
          aria-label="The week before"
          disabled={WEEK_NOW + week <= 1}
          onClick={() => step(-1)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M14.500 6.500L9 12l5.500 5.500" />
          </svg>
        </button>
        <h2 aria-live="polite">
          {span}{" "}
          <small>
            Week {WEEK_NOW + week} of {WEEKS}
          </small>
        </h2>
        <button
          type="button"
          className={styles.arrow}
          aria-label="The week after"
          disabled={week >= 1}
          onClick={() => step(1)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M9.500 6.500L15 12l-5.500 5.500" />
          </svg>
        </button>
      </div>

      {/* a phone's strip of days. Under each date, what is still to do, as dots in three rows:
          Reading and Writing, then Math, then Mixed. A row keeps its place when it is empty. */}
      {!rail && (
        <div className={`${lib.glass} ${styles.strip}`} role="group" aria-label="Day">
          {days.map((day, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={picked === i}
              aria-label={day.date.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })}
              onClick={() => {
                setPicked(i);
                tick();
              }}
            >
              {picked === i && (
                <motion.span
                  layoutId="homework-day"
                  className={lib.lens}
                  transition={
                    still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                  }
                />
              )}
              <span>{day.date.toLocaleDateString("en-US", { weekday: "narrow" })}</span>
              <b>{day.date.getDate()}</b>
              <span className={styles.marks}>
                {(Object.keys(KINDS) as Kind[]).map((kind) => (
                  <span key={kind} data-kind={kind}>
                    {day.work
                      .filter((w) => w.kind === kind && w.state !== "done")
                      .map((w) => (
                        <i key={w.id} />
                      ))}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.week} style={{ "--days": shown.length } as CSSProperties}>
        {shown.map((day) => (
          <Day key={day.date.getTime()} day={day} wide={rail} />
        ))}
      </div>
    </div>
  );
}
