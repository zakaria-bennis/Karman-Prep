"use client";

// The small drawn pieces of Homework: the picture that says what sort of work a piece is, the sign
// of its state, a piece of work itself, and the exam's banner. Everything is drawn here in code.
import type { CSSProperties } from "react";
import { ACCESSORIES, Dressed, type Outfit } from "./accessories";
import { EXAM, KINDS, SORTS, type HomeworkDay, type Sort, type Work } from "./homeworkData";
import styles from "./homework.module.css";
import { tick } from "./sound";

/** What a character has on, by the names of the things (one that is not found is left off). */
export const wearing = (...names: string[]): Outfit =>
  Object.fromEntries(
    names
      .map((name) => ACCESSORIES.find((a) => a.name === name))
      .filter((a) => a !== undefined)
      .map((a) => [a.slot, a.id])
  );

/** A small picture for each sort of work, so its name need not be written. */
export function SortIcon({ sort }: { sort: Sort }) {
  return (
    <svg className={styles.sort} viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      {sort === "skill" && (
        // the four squares of a skill's level
        <>
          <rect x="4" y="4" width="8.500" height="8.500" rx="2.500" data-fill />
          <rect x="15.500" y="4" width="8.500" height="8.500" rx="2.500" data-fill />
          <rect x="4" y="15.500" width="8.500" height="8.500" rx="2.500" data-fill />
          <rect x="15.500" y="15.500" width="8.500" height="8.500" rx="2.500" />
        </>
      )}
      {sort === "cards" && (
        // two cards, one fanned behind the other
        <>
          <rect x="8" y="4" width="14" height="18" rx="3" transform="rotate(10 15 13)" />
          <rect x="5" y="6" width="14" height="18" rx="3" data-fill data-part="card" />
          <path d="M9 12h6M9 16h4" data-ink />
        </>
      )}
      {sort === "trial" && (
        // a stopwatch whose hand goes round
        <>
          <circle cx="14" cy="16" r="9" />
          <path d="M11 3.500h6M14 3.500V7" />
          <path d="M14 16V10.500" data-part="hand" />
        </>
      )}
      {sort === "strategy" && (
        // a light bulb
        <>
          <path
            d="M14 3.500a7.500 7.500 0 0 0-4.500 13.500c.9.800 1.300 1.700 1.300 2.800h6.400c0-1.100.4-2 1.300-2.800A7.500 7.500 0 0 0 14 3.500Z"
            data-fill
            data-part="bulb"
          />
          <path d="M11.500 23h5M12.500 25.500h3" />
        </>
      )}
    </svg>
  );
}

/** A piece of work: liquid glass in its subject's color, the sort's picture, its name and how much. */
export function Item({ work, small = false }: { work: Work; small?: boolean }) {
  const state = { todo: "", done: "Done", missing: "Missing", closed: "Closed" }[work.state];
  return (
    <li>
      <button
        type="button"
        className={styles.work}
        data-kind={work.kind}
        data-state={work.state}
        data-small={small || undefined}
        disabled={work.state === "closed"}
        aria-label={`${work.name}, ${SORTS[work.sort]}, ${KINDS[work.kind]}, ${work.much}${
          state ? `, ${state}` : ""
        }`}
        onClick={() => tick()}
      >
        <SortIcon sort={work.sort} />
        <span>
          <b>{work.name}</b>
          {!small && <small>{work.much}</small>}
        </span>
        {/* its state is a sign, not a word: a check for done, a mark for missed, a lock for closed */}
        {work.state !== "todo" && (
          <svg
            className={styles.sign}
            data-sign={work.state}
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
          >
            {work.state === "done" && <path d="M5.500 12.500l4.200 4.200L18.500 8" />}
            {work.state === "missing" && (
              <>
                <circle cx="12" cy="12" r="10" data-disc />
                <path d="M12 6.500v7M12 17.200v.300" />
              </>
            )}
            {work.state === "closed" && (
              <>
                <rect x="6" y="11" width="12" height="9" rx="2.500" />
                <path d="M8.500 11V8.500a3.500 3.500 0 0 1 7 0V11" />
              </>
            )}
          </svg>
        )}
      </button>
    </li>
  );
}

/** The week's full-length exam: a banner of its own, with Karman in his cap. It says when the exam
 *  opens and closes. On the day itself it can be begun. */
export function ExamBanner({ day }: { day: HomeworkDay }) {
  const open = day.from === 0;
  const past = day.from < 0;
  return (
    <section className={styles.exam} data-open={open || undefined} aria-label="Full-length exam">
      {/* slow lights drift behind the glass, and small stars come and go */}
      <span className={styles.lights} aria-hidden="true" />
      {[0, 1, 2, 3, 4].map((n) => (
        <i
          key={n}
          className={styles.star}
          style={{ "--n": n } as CSSProperties}
          aria-hidden="true"
        />
      ))}
      <span className={styles.examFox} aria-hidden="true">
        <Dressed face="fox" outfit={wearing("Graduation cap", "Monocle")} size={84} />
      </span>
      <div>
        <h2>Full-length exam</h2>
        <p>
          {past ? "Done" : open ? "Open now" : "Opens"}{" "}
          {!past && <b>{open ? `until ${EXAM.closes}` : `Saturday at ${EXAM.opens}`}</b>}
          {!past && !open && ` and closes at ${EXAM.closes}`}
        </p>
      </div>
      {open ? (
        <button type="button" className={styles.start} onClick={() => tick()}>
          Start
        </button>
      ) : (
        !past && (
          <p className={styles.until}>
            <b>{day.from}</b> {day.from === 1 ? "day" : "days"}
          </p>
        )
      )}
    </section>
  );
}
