"use client";

// Homework: where a Cohort or Private student lands (founder, 2026-11-16; the rules are in
// homeworkData.ts). It opens on the day.
//   The banner   the week's full-length exam, with Karman in his cap: when it opens and closes.
//   The left     Karman inside a ring that fills as the day's work is done, and how much is left;
//                the week as seven small bars that fill the same way (pressing one goes to that
//                day); and the next class.
//   The right    the day's work, each piece liquid glass in its subject's color with a picture of
//                its sort. Arrows step to the days before and after. Done work is behind Completed.
//   Week         a button lays the whole week out, a day beside a day; pressing a day goes to it.
// On a phone the same pieces stack: banner, ring and bars side by side, then the day's work.
// Pressing a piece of work leads nowhere yet: each activity's beginning screen is still to come.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import { Dressed } from "./accessories";
import { ExamBanner, Item, wearing } from "./HomeworkBits";
import { WEEK_NOW, WEEKS, weekOf, type HomeworkDay } from "./homeworkData";
import styles from "./homework.module.css";
import lib from "./library.module.css";
import { DAY, TODAY } from "./progressData";
import { tick } from "./sound";

const FIRST = -(WEEK_NOW - 1) * 7 - TODAY.getDay();
const LAST = 13 - TODAY.getDay();
const name = (day: HomeworkDay) =>
  day.from === 0
    ? "Today"
    : day.from === 1
      ? "Tomorrow"
      : day.from === -1
        ? "Yesterday"
        : day.date.toLocaleDateString("en-US", { weekday: "long" });
const short = (day: HomeworkDay) =>
  day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const tally = (day: HomeworkDay) => ({
  all: day.work.length,
  done: day.work.filter((w) => w.state === "done").length,
});

const Chevron = ({ back = false }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d={back ? "M14.500 6.500L9 12l5.500 5.500" : "M9.500 6.500L15 12l-5.500 5.500"} />
  </svg>
);

/** The day's work: what is left, and at the foot what has been done. */
function Work({ day }: { day: HomeworkDay }) {
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const left = day.work.filter((w) => w.state !== "done");
  const done = day.work.filter((w) => w.state === "done");
  return (
    <>
      {day.class && (
        <p className={styles.class}>
          {/* a chalkboard on its stand */}
          <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
            <rect x="3.500" y="4.500" width="21" height="14" rx="2.500" />
            <path d="M8 10.500c2-2.500 4 2.500 6 0s4 2.500 6 0M10 23.500l2-5M18 23.500l-2-5" />
          </svg>
          Class at <b>{day.class}</b>
        </p>
      )}
      {left.length > 0 ? (
        <ul className={styles.list}>
          {left.map((work) => (
            <Item key={work.id} work={work} />
          ))}
        </ul>
      ) : (
        // nothing left: Karman in a party hat, hopping
        <div className={styles.clear}>
          <span className={styles.hop}>
            <Dressed face="fox" outfit={wearing("Party hat")} size={96} />
          </span>
          <p>{day.work.length ? "All done" : day.exam ? "Exam day" : "Nothing assigned"}</p>
        </div>
      )}
      {done.length > 0 && (
        <div className={styles.done}>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul
                className={styles.list}
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
    </>
  );
}

export default function Homework() {
  const still = useReducedMotion() ?? false;
  /** The day shown, in days from today. */
  const [at, setAt] = useState(0);
  const [whole, setWhole] = useState(false);
  const week = Math.floor((at + TODAY.getDay()) / 7);
  const days = weekOf(week);
  const day = days[new Date(TODAY.getTime() + at * DAY).getDay()];
  const exam = days[6];
  const { all, done } = tally(day);
  const left = all - done;
  const weekAll = days.reduce((n, d) => n + d.work.length, 0);
  const weekDone = days.reduce((n, d) => n + tally(d).done, 0);
  const next = [...days, ...weekOf(week + 1)].find((d) => d.class && d.from >= 0);
  const go = (to: number) => {
    setAt(Math.max(FIRST, Math.min(LAST, to)));
    tick();
  };
  const R = 74;
  const round = 2 * Math.PI * R;

  return (
    <div className={`${lib.library} ${styles.homework}`} data-whole={whole || undefined}>
      <ExamBanner day={exam} />

      {!whole && (
        <section className={`${lib.glass} ${styles.side}`} aria-label="At a glance">
          {/* Karman inside a ring that fills as the day's work is done */}
          <div className={styles.ring}>
            <svg viewBox="0 0 168 168" width="168" height="168" aria-hidden="true">
              <circle cx="84" cy="84" r={R} className={styles.track} />
              <circle
                cx="84"
                cy="84"
                r={R}
                className={styles.fill}
                strokeDasharray={round}
                strokeDashoffset={round * (1 - (all ? done / all : 1))}
                transform="rotate(-90 84 84)"
              />
            </svg>
            <span className={styles.bob}>
              <Dressed face="fox" outfit={wearing("Pencil", left ? "" : "Party hat")} size={104} />
            </span>
          </div>
          <p className={styles.count} aria-live="polite">
            <b>{left}</b>
            {day.from < 0 ? "missed" : day.from === 0 ? "left today" : "to do"}
          </p>

          {/* the week as seven bars, each filling as its day is done. Pressing one goes to it. */}
          <div className={styles.bars} role="group" aria-label="This week">
            {days.map((d) => {
              const t = tally(d);
              return (
                <button
                  key={d.from}
                  type="button"
                  aria-pressed={d.from === at}
                  aria-label={`${d.date.toLocaleDateString("en-US", { weekday: "long" })}, ${t.done} of ${t.all} done`}
                  data-today={d.from === 0 || undefined}
                  onClick={() => go(d.from)}
                >
                  <span className={styles.bar}>
                    {d.exam ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M12 3l2.600 5.600 6.100.700-4.500 4.200 1.200 6-5.400-3-5.400 3 1.200-6L3.300 9.300l6.100-.700Z" />
                      </svg>
                    ) : (
                      <i style={{ height: `${t.all ? (t.done / t.all) * 100 : 0}%` }} />
                    )}
                  </span>
                  {d.date.toLocaleDateString("en-US", { weekday: "narrow" })}
                </button>
              );
            })}
          </div>
          <p className={styles.weekly}>
            <b>{weekDone}</b> of {weekAll} this week
          </p>

          {next && (
            <p className={styles.next}>
              Next class
              <b>
                {next.from === 0
                  ? "Today"
                  : next.date.toLocaleDateString("en-US", { weekday: "long" })}
                , {next.class}
              </b>
            </p>
          )}
        </section>
      )}

      <section className={`${lib.glass} ${styles.main}`} aria-label={whole ? "Week" : "Day"}>
        <header>
          <button
            type="button"
            className={styles.arrow}
            aria-label={whole ? "The week before" : "The day before"}
            disabled={whole ? week <= -(WEEK_NOW - 1) : at <= FIRST}
            onClick={() => go(at - (whole ? 7 : 1))}
          >
            <Chevron back />
          </button>
          <h2 aria-live="polite">
            {whole ? (
              <>
                {short(days[0])} to {short(days[6])}{" "}
                <small>
                  Week {WEEK_NOW + week} of {WEEKS}
                </small>
              </>
            ) : (
              <>
                {name(day)} <small>{short(day)}</small>
              </>
            )}
          </h2>
          <button
            type="button"
            className={styles.arrow}
            aria-label={whole ? "The week after" : "The day after"}
            disabled={whole ? week >= 1 : at >= LAST}
            onClick={() => go(at + (whole ? 7 : 1))}
          >
            <Chevron />
          </button>
          <div className={`${lib.filter} ${styles.views}`} role="group" aria-label="Show">
            {[false, true].map((w) => (
              <button
                key={String(w)}
                type="button"
                aria-pressed={whole === w}
                onClick={() => {
                  setWhole(w);
                  tick();
                }}
              >
                {whole === w && (
                  <motion.span
                    layoutId="homework-view"
                    className={lib.lens}
                    transition={
                      still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                    }
                  />
                )}
                <span>{w ? "Week" : "Day"}</span>
              </button>
            ))}
          </div>
        </header>

        {whole ? (
          <div className={styles.week}>
            {days.map((d) => (
              <div key={d.from} className={styles.col} data-today={d.from === 0 || undefined}>
                {/* pressing a day's name goes to that day */}
                <button
                  type="button"
                  className={styles.colHead}
                  onClick={() => {
                    setAt(d.from);
                    setWhole(false);
                    tick();
                  }}
                >
                  <b>
                    {d.from === 0
                      ? "Today"
                      : d.date.toLocaleDateString("en-US", { weekday: "short" })}
                  </b>
                  <span>{d.date.getDate()}</span>
                </button>
                <ul className={styles.list}>
                  {d.work.map((work) => (
                    <Item key={work.id} work={work} small />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.dayBody} style={{ "--many": Math.max(1, left) } as CSSProperties}>
            <Work key={day.from} day={day} />
          </div>
        )}
      </section>
    </div>
  );
}
