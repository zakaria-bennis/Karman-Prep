"use client";

// The small drawn pieces of Homework: the picture that says what sort of work a piece is, the
// picture of a Math domain, the sign of a piece's state, a piece of work itself, and the exam's
// banner. Everything is drawn here in code and moved with GSAP (homeworkMotion.ts).
import gsap from "gsap";
import { useEffect, useRef, type CSSProperties } from "react";
import { ACCESSORIES, Dressed, type Outfit } from "./accessories";
import { useEquipped } from "./equipped";
import {
  EXAM,
  KINDS,
  SORTS,
  type HomeworkDay,
  type MathDomain,
  type Sort,
  type Work,
} from "./homeworkData";
import { calm, cut, finish, stir, two } from "./homeworkMotion";
import styles from "./homework.module.css";
import { chosen, tick } from "./sound";

const HOUR = 3_600_000;

/** A small picture for each sort of work, so its name need not be written. */
export function SortIcon({ sort }: { sort: Sort }) {
  return (
    <svg
      className={styles.sort}
      data-move={sort}
      viewBox="0 0 28 28"
      width="28"
      height="28"
      aria-hidden="true"
    >
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
        <>
          <rect x="8" y="4" width="14" height="18" rx="3" transform="rotate(10 15 13)" />
          <g data-part="card">
            <rect x="5" y="6" width="14" height="18" rx="3" data-fill />
            <path d="M9 12h6M9 16h4" />
          </g>
        </>
      )}
      {sort === "trial" && (
        <>
          <circle cx="14" cy="16" r="9" />
          <path d="M11 3.500h6M14 3.500V7" />
          <path d="M14 16V10.500" data-part="hand" />
        </>
      )}
      {sort === "strategy" && (
        <>
          <path
            d="M14 3.500a7.500 7.500 0 0 0-4.500 13.500c.9.800 1.300 1.700 1.300 2.800h6.400c0-1.100.4-2 1.300-2.800A7.500 7.500 0 0 0 14 3.500Z"
            data-part="bulb"
          />
          <path d="M11.500 23h5M12.500 25.500h3" />
        </>
      )}
    </svg>
  );
}

/** Each of Math's four domains has a picture of its own, with its own movement. */
export function DomainIcon({ domain }: { domain: MathDomain }) {
  return (
    <svg
      className={styles.sort}
      data-move={domain}
      viewBox="0 0 28 28"
      width="28"
      height="28"
      aria-hidden="true"
    >
      {domain === "algebra" && (
        // a straight line on its graph
        <>
          <path d="M5 4V23H24" opacity="0.6" />
          <path d="M7 20L21 8" pathLength={1} strokeDasharray="1" data-draw />
          <circle cx="21" cy="8" r="2.400" data-solid />
        </>
      )}
      {domain === "advanced" && (
        // a parabola
        <>
          <path d="M5 4V23H24" opacity="0.6" />
          <path d="M8 6Q15 34 22 6" pathLength={1} strokeDasharray="1" data-draw />
        </>
      )}
      {domain === "data" && (
        // a bar chart
        <>
          <path d="M4 24H24" opacity="0.6" />
          <rect x="5.500" y="15" width="4.500" height="9" rx="1.200" data-fill />
          <rect x="11.800" y="8" width="4.500" height="16" rx="1.200" data-fill />
          <rect x="18" y="12" width="4.500" height="12" rx="1.200" data-fill />
        </>
      )}
      {domain === "geometry" && (
        // a triangle round a circle
        <>
          <path d="M14 4L25 23H3Z" />
          <circle cx="14" cy="16.500" r="3.600" data-fill />
        </>
      )}
    </svg>
  );
}

/** A piece of work: tinted glass on the pane, the sort's picture, its name and how much. A piece
 *  still to do is finished by pressing it (until each activity has a screen of its own, so the
 *  finishing can be looked at). */
export function Item({
  work,
  small = false,
  onFinish,
}: {
  work: Work;
  small?: boolean;
  onFinish?: (id: string) => void;
}) {
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
        onPointerEnter={(e) => e.pointerType === "mouse" && stir(e.currentTarget)}
        onClick={(e) => {
          stir(e.currentTarget);
          if (work.state === "todo" && onFinish) {
            chosen();
            finish(e.currentTarget, () => onFinish(work.id));
          } else tick();
        }}
      >
        <SortIcon sort={work.sort} />
        <span>
          <b>{work.name}</b>
          {!small && <small>{work.much}</small>}
        </span>
        {work.domain && !small && <DomainIcon domain={work.domain} />}
        {/* its state is a sign, not a word: a check for done, a mark for missed, a lock for closed.
            A piece still to do carries a check that is drawn when it is finished. */}
        <svg
          className={styles.sign}
          data-sign={work.state}
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          {(work.state === "done" || work.state === "todo") && (
            <path
              d="M5.500 12.500l4.200 4.200L18.500 8"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={work.state === "todo" ? 1 : 0}
              data-check
            />
          )}
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
      </button>
    </li>
  );
}

function Clock({ ms, days = true }: { ms: number; days?: boolean }) {
  const t = cut(ms);
  const cells: [number, string][] = [
    ...(days ? ([[t.days, "days"]] as [number, string][]) : []),
    [days ? t.hours : t.hours + t.days * 24, "hours"],
    [t.minutes, "min"],
    [t.seconds, "sec"],
  ];
  return (
    <span className={styles.clock} role="timer" aria-live="off">
      {cells.map(([n, word]) => (
        <span key={word}>
          <b>{two(n)}</b>
          {word}
        </span>
      ))}
    </span>
  );
}

/** The week's full-length exam: a banner of its own, with the student's character in a cap. A
 *  clock counts down to when it opens. Then a Start exam button pops up, and under it a clock
 *  counts down to when it closes. `open` shows that state now, to look at it. */
export function ExamBanner({
  day,
  now,
  open: forced,
}: {
  day: HomeworkDay;
  now: number;
  open: boolean;
}) {
  const { face, outfit } = useEquipped();
  const midnight = new Date(day.date).setHours(0, 0, 0, 0);
  const opens = midnight + EXAM.opens * HOUR;
  const closes = midnight + EXAM.closes * HOUR;
  const open = forced || (now >= opens && now < closes);
  const over = !forced && now >= closes;
  const start = useRef<HTMLButtonElement>(null);
  // the button pops up when the exam opens
  useEffect(() => {
    if (!open || !start.current || calm()) return;
    gsap.fromTo(
      start.current,
      { scale: 0, rotate: -8 },
      { scale: 1, rotate: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" }
    );
  }, [open]);
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
        <Dressed
          face={face}
          outfit={{ ...outfit, head: wearing("Graduation cap").head }}
          size={84}
        />
      </span>
      <h2>Full-length exam</h2>
      {over ? (
        <p className={styles.over}>Done</p>
      ) : open ? (
        <div className={styles.go}>
          <button ref={start} type="button" className={styles.start} onClick={() => tick()}>
            Start exam
          </button>
          <p>
            Closes in{" "}
            <Clock
              ms={forced && now < opens ? 18 * HOUR - (now % HOUR) : closes - now}
              days={false}
            />
          </p>
        </div>
      ) : (
        <Clock ms={opens - now} />
      )}
    </section>
  );
}

/** What a character has on, by the names of the things (one that is not found is left off). */
export function wearing(...names: string[]): Outfit {
  return Object.fromEntries(
    names
      .map((name) => ACCESSORIES.find((a) => a.name === name))
      .filter((a) => a !== undefined)
      .map((a) => [a.slot, a.id])
  );
}
