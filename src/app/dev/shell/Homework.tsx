"use client";

// Homework: where a Cohort or Private student lands (founder, 2026-11-16; the rules are in
// homeworkData.ts). The whole week is laid out, a day beside a day, with today marked. A day is one
// list with the Daily 10 first. Each kind of work has its own color, and a band over the week shows
// how much of each there is, so a glance says what the week is mostly made of.
// With room, the seven days stand side by side. On a phone the seven days are a strip across the top,
// each with its work as small marks, and the day pressed is shown under it.
// Pressing a piece of work leads nowhere yet: each activity's beginning screen is still to come.
import { motion, useReducedMotion } from "framer-motion";
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

const kindsIn = (days: HomeworkDay[]) =>
  (Object.keys(KINDS) as Kind[])
    .map((kind) => ({
      kind,
      many: days.reduce((n, d) => n + d.work.filter((w) => w.kind === kind).length, 0),
    }))
    .filter((k) => k.many > 0);

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

const dayWord = (day: HomeworkDay) =>
  day.from === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "long" });

export default function Homework({ rail }: { rail: boolean }) {
  const still = useReducedMotion() ?? false;
  const [week, setWeek] = useState(0);
  const days = weekOf(week);
  const today = days.findIndex((d) => d.from === 0);
  const [picked, setPicked] = useState(today < 0 ? 0 : today);
  const kinds = kindsIn(days);
  const all = days.reduce((n, d) => n + d.work.length, 0);
  const done = days.reduce((n, d) => n + d.work.filter((w) => w.state === "done").length, 0);
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
      <section className={`${lib.glass} ${styles.top}`} aria-label="This week">
        <header>
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
          <p className={styles.far}>
            <b>{done}</b> of {all} done
          </p>
        </header>
        {/* the week in one band: a stretch for each kind of work, as long as there is of it */}
        <div className={styles.band} role="img" aria-label="What this week is made of">
          {kinds.map((k) => (
            <i key={k.kind} data-kind={k.kind} style={{ flexGrow: k.many }} />
          ))}
        </div>
        <ul className={styles.key}>
          {kinds.map((k) => (
            <li key={k.kind} data-kind={k.kind}>
              <i />
              {KINDS[k.kind]} <b>{k.many}</b>
            </li>
          ))}
        </ul>
      </section>

      {/* a phone's strip of days, each with its work as small marks */}
      {!rail && (
        <div className={`${lib.glass} ${styles.strip}`} role="group" aria-label="Day">
          {days.map((day, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={picked === i}
              aria-label={day.date.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })}
              data-today={day.from === 0 || undefined}
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
                {day.work.map((w) => (
                  <i key={w.id} data-kind={w.kind} data-state={w.state} />
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.week} style={{ "--days": shown.length } as CSSProperties}>
        {shown.map((day) => (
          <section
            key={day.date.getTime()}
            className={`${lib.glass} ${styles.day}`}
            data-today={day.from === 0 || undefined}
            data-past={day.from < 0 || undefined}
            aria-label={day.date.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })}
          >
            <header>
              <h3>{dayWord(day)}</h3>
              <span>{day.date.getDate()}</span>
            </header>
            {day.class && <p className={styles.class}>Class at {day.class}</p>}
            <ul>
              {day.work.map((work) => (
                <Item key={work.id} work={work} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
