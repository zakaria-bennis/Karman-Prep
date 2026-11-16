"use client";

// Homework: where a Cohort or Private student lands (founder, 2026-11-16; the rules are in
// homeworkData.ts). It opens on the day.
//   The banner   the week's full-length exam: a clock counting down to when it opens, then a Start
//                exam button and a clock counting down to when it closes.
//   The left     the student's own character, in what they have on, inside a ring that fills as the
//                day's work is done. It watches the pointer, and pressing it plays a trick. Under
//                it, a line of words that changes (what is left, about how long), and the next
//                class as a button with its own countdown that goes to the class.
//   The right    the day's work, one piece under another, each tinted glass with a picture of its
//                sort and a Start button. Today's Daily 10, until it is done, leads the day as a
//                card of its own. Arrows step to other days, and the pieces slide in from the
//                side stepped toward. Done work is behind Completed.
//   Week         a switch lays the whole week out; pressing a day goes to it.
// Pressing Start on a piece finishes it, so the finishing can be looked at: each activity's own
// screen is still to come.
// On a phone the same pieces stack: banner, ring and bars side by side, then the day's work.
// Pressing a piece of work leads nowhere yet: each activity's beginning screen is still to come.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Dressed } from "./accessories";
import { useEquipped } from "./equipped";
import { DailyTen, ExamBanner, Item, wearing } from "./HomeworkBits";
import { Buddy, ClassButton, Ticker } from "./HomeworkBuddy";
import { arrive, useClock } from "./homeworkMotion";
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
function Work({
  day,
  daily,
  onDaily,
  onFinish,
}: {
  day: HomeworkDay;
  /** Today's Daily 10 is still to do. */
  daily: boolean;
  onDaily: () => void;
  onFinish: (id: string) => void;
}) {
  const { face } = useEquipped();
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const left = day.work.filter((w) => w.state !== "done");
  const done = day.work.filter((w) => w.state === "done");
  return (
    <>
      {/* today's Daily 10, until it is done, leads the day */}
      {daily && <DailyTen onStart={onDaily} />}
      {left.length > 0 ? (
        <ul className={styles.list}>
          {left.map((work) => (
            <Item key={work.id} work={work} onFinish={onFinish} />
          ))}
        </ul>
      ) : (
        // nothing left: the character in a party hat, hopping
        <div className={styles.clear} data-in>
          <span className={styles.hop}>
            <Dressed face={face} outfit={wearing("Party hat")} size={96} />
          </span>
          <p>{day.work.length ? "All done" : day.exam ? "Exam day" : "Nothing assigned"}</p>
        </div>
      )}
      {done.length > 0 && (
        <div className={styles.done}>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul
                className={`${styles.list} ${styles.grid}`}
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

export default function Homework({ examOpen }: { examOpen: boolean }) {
  const now = useClock();
  /** Work finished on this page by pressing it, until each activity has its own screen. */
  const [finished, setFinished] = useState<string[]>([]);
  const [cheer, setCheer] = useState(0);
  const [dailyDone, setDailyDone] = useState(false);
  /** Which way the last step went, so what arrives comes in from that side. */
  const body = useRef<HTMLDivElement>(null);
  const from = useRef(0);
  const still = useReducedMotion() ?? false;
  /** The day shown, in days from today. */
  const [at, setAt] = useState(0);
  const [whole, setWhole] = useState(false);
  const week = Math.floor((at + TODAY.getDay()) / 7);
  const mark = (list: HomeworkDay[]) =>
    list.map((d) => ({
      ...d,
      work: d.work.map((w) => (finished.includes(w.id) ? { ...w, state: "done" as const } : w)),
    }));
  const days = mark(weekOf(week));
  const day = days[new Date(TODAY.getTime() + at * DAY).getDay()];
  const exam = days[6];
  const { all, done } = tally(day);
  const left = all - done;
  // the next class from now, whatever day is being looked at
  const next = [...weekOf(0), ...weekOf(1)].find(
    (d) => d.class && new Date(d.date).setHours(20, 30, 0, 0) > now
  );
  const go = (to: number) => {
    from.current = to > at ? 1 : -1;
    setAt(Math.max(FIRST, Math.min(LAST, to)));
    tick();
  };
  // stepping to another day or week, or switching between them, brings the pieces in from the side
  useEffect(() => {
    if (from.current !== 0) arrive(body.current, from.current);
  }, [at, whole]);
  // the words under the character: what is left, about how long it will take, and the class
  const minutes = day.work
    .filter((w) => w.state !== "done")
    .reduce((n, w) => n + (w.sort === "cards" ? 4 : parseInt(w.much, 10) * 1.3), 0);
  const lines =
    left === 0
      ? [day.from < 0 ? "Nothing missed" : "All done", "Nice work"]
      : [
          `${left} ${day.from < 0 ? "missed" : day.from === 0 ? "left today" : "to do"}`,
          `About ${Math.max(5, Math.round(minutes / 5) * 5)} minutes`,
          ...(day.class ? [`Class at ${day.class}`] : []),
        ];
  const R = 74;
  const round = 2 * Math.PI * R;

  return (
    <div className={`${lib.library} ${styles.homework}`} data-whole={whole || undefined}>
      <ExamBanner day={exam} now={now} open={examOpen} />

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
            <Buddy size={104} cheer={cheer} />
          </div>
          <Ticker lines={lines} />

          {/* the next class: a button with a clock counting down to it */}
          {next && <ClassButton day={next} now={now} />}
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
                  from.current = w ? 1 : -1;
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
          <div ref={body} className={styles.week}>
            {days.map((d) => (
              <div
                key={d.from}
                className={styles.col}
                data-today={d.from === 0 || undefined}
                data-in
              >
                {/* pressing a day's name goes to that day */}
                <button
                  type="button"
                  className={styles.colHead}
                  onClick={() => {
                    from.current = -1;
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
          <div ref={body} className={styles.dayBody}>
            <Work
              key={day.from}
              day={day}
              daily={day.from === 0 && !dailyDone}
              onDaily={() => {
                setDailyDone(true);
                setCheer(cheer + 1);
              }}
              onFinish={(id) => {
                setFinished([...finished, id]);
                setCheer(cheer + 1);
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
