"use client";

// The small drawn pieces of Homework: the picture that says what sort of work a piece is, the
// picture of a Math domain, the sign of a piece's state, a piece of work itself, and the exam's
// banner. Everything is drawn here in code and moved with GSAP (homeworkMotion.ts).
import gsap from "gsap";
import { useEffect, useRef, type CSSProperties } from "react";
import { ACCESSORIES, Dressed, type Outfit } from "./accessories";
import { useEquipped } from "./equipped";
import { EXAM, KINDS, SORTS, type HomeworkDay, type Sort, type Work } from "./homeworkData";
import { calm, cut, finish, stir, two } from "./homeworkMotion";
import styles from "./homework.module.css";
import { chosen, tick } from "./sound";

const HOUR = 3_600_000;
/** The banner's stars: round, of several sizes, always in the same places. */
const STARS = Array.from({ length: 26 }, (_, n) => {
  const at = (k: number) => {
    const x = Math.sin((n + 1) * 91.7 + k * 37.3) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    x: Math.round(at(1) * 1000) / 10,
    y: Math.round(at(2) * 1000) / 10,
    r: at(3) < 0.75 ? 1.5 : at(3) < 0.94 ? 2.5 : 3.5,
    w: Math.round(at(4) * 40) / 10,
  };
});

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
          {/* a compass, for a strategy quiz: marks round its edge for the eight directions (the four
              main ones longer) */}
          <circle cx="14" cy="14" r="11" />
          <path d="M14 3v3M14 22v3M3 14h3M22 14h3" />
          <path
            d="M6.200 6.200l1.300 1.300M21.800 6.200l-1.300 1.300M6.200 21.800l1.300-1.300M21.800 21.800l-1.300-1.300"
            strokeWidth="1.200"
          />
          {/* the needle: two arrowheads joined at the middle, red toward north, blue toward south */}
          <g data-part="needle">
            <g transform="rotate(28 14 14)" stroke="none">
              <path d="M14 5.500L16.800 14H11.200Z" fill="#ff5a4f" />
              <path d="M14 22.500L11.200 14H16.800Z" fill="#4f9dff" />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}

/** A piece of work: tinted glass on the pane, the sort's picture, its name and how much, and a
 *  Start button. Until each activity has a screen of its own, Start finishes the piece, so the
 *  finishing can be looked at. The week's small pieces have no button. */
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
  const open = work.state === "todo" || work.state === "missing";
  const done = work.state === "done";
  return (
    <li data-in>
      <div
        className={styles.work}
        data-kind={work.kind}
        data-state={work.state}
        data-small={small || undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && stir(e.currentTarget)}
      >
        <SortIcon sort={work.sort} />
        <span>
          <b>{work.name}</b>
          {!small && <small>{work.much}</small>}
          <span className={styles.said}>
            {SORTS[work.sort]}, {KINDS[work.kind]}
            {state && `, ${state}`}
          </span>
        </span>
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
        {open && !small && onFinish && (
          <button
            type="button"
            className={styles.begin}
            aria-label={`Start ${work.name}`}
            onClick={(e) => {
              const piece = e.currentTarget.closest<HTMLElement>("[data-kind]");
              if (!piece) return;
              stir(piece);
              chosen();
              e.currentTarget.disabled = true;
              finish(piece, () => onFinish(work.id));
            }}
          >
            Start
          </button>
        )}
        {/* a finished piece can be gone over again: its mistakes are looked at from here */}
        {done && !small && (
          <button
            type="button"
            className={styles.begin}
            aria-label={`Review ${work.name}`}
            onClick={() => tick()}
          >
            Review
          </button>
        )}
      </div>
    </li>
  );
}

/** Today's Daily 10, when it is not yet done: a card of its own at the head of the day, glowing
 *  orange like hot metal, with embers rising through it (his reference: the Nuclear Fallout finish
 *  in Call of Duty: Mobile), ten dots that light in a wave, and Start on it. */
export function DailyTen({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || calm()) return;
    // ten dots light in a wave, one after another, and rest
    const wave = gsap.to(ref.current.querySelectorAll("[data-dot]"), {
      keyframes: [
        { y: -6, scale: 1.25, opacity: 1, duration: 0.3, ease: "power2.out" },
        { y: 0, scale: 1, opacity: 0.55, duration: 0.5, ease: "bounce.out" },
      ],
      stagger: { each: 0.09, repeat: -1, repeatDelay: 1.8 },
    });
    // embers drift up through the card and wink out, each on a path of its own
    const embers = gsap.utils.toArray<HTMLElement>(ref.current.querySelectorAll("[data-ember]"));
    const rises = embers.map((el, n) =>
      gsap.fromTo(
        el,
        { x: 0, y: 0, opacity: 0, scale: 0.6 },
        {
          keyframes: [
            { opacity: 1, scale: 1, duration: 0.5 },
            { opacity: 0, scale: 0.4, duration: 1.6 },
          ],
          x: () => gsap.utils.random(-26, 26),
          y: () => gsap.utils.random(-70, -40),
          duration: 2.1,
          ease: "sine.out",
          repeat: -1,
          repeatRefresh: true,
          delay: n * 0.37,
        }
      )
    );
    return () => {
      wave.kill();
      rises.forEach((r) => r.kill());
    };
  }, []);
  return (
    <div ref={ref} className={styles.daily} data-in>
      {/* molten light that flows, and embers that rise through it */}
      <span className={styles.molten} aria-hidden="true" />
      {Array.from({ length: 9 }, (_, n) => (
        <i
          key={n}
          className={styles.ember}
          style={{ left: `${8 + n * 10.5}%`, top: `${58 + ((n * 37) % 34)}%` }}
          data-ember
          aria-hidden="true"
        />
      ))}
      <p>
        <b>Daily 10</b>
        <span className={styles.dots} aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} data-dot />
          ))}
        </span>
      </p>
      <button
        type="button"
        className={styles.begin}
        aria-label="Start the Daily 10"
        onClick={(e) => {
          chosen();
          e.currentTarget.disabled = true;
          if (ref.current) finish(ref.current, onStart);
          else onStart();
        }}
      >
        Start
      </button>
    </div>
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
          {/* the server and the browser read the time a moment apart */}
          <b suppressHydrationWarning>{two(n)}</b>
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
  number,
  open: forced,
}: {
  day: HomeworkDay;
  /** Which of the nine weekly exams it is. */
  number: number;
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
      {/* the scene: a beach as the light goes. Dusk with a moon and a few round stars by night,
          sunset by day. Waves roll in and wash up the sand, one after another. */}
      <span className={styles.shore} aria-hidden="true">
        {STARS.map((s, n) => (
          <i
            key={n}
            className={styles.star}
            style={
              {
                left: `${s.x}%`,
                top: `${s.y * 0.42}%`,
                "--size": `${s.r}px`,
                "--wait": `${s.w}s`,
              } as CSSProperties
            }
          />
        ))}
        <span className={styles.orb} />
        <span className={styles.glitter} />
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          {/* far swell, nearer swell, then the wave that breaks on the sand with its foam */}
          <path
            className={styles.swell}
            d="M0 52 Q150 44 300 52 T600 52 T900 52 T1200 52 T1500 52 T1800 52 V120 H0Z"
          />
          <path
            className={styles.swell2}
            d="M0 66 Q100 58 200 66 T400 66 T600 66 T800 66 T1000 66 T1200 66 T1400 66 T1600 66 V120 H0Z"
          />
          <path className={styles.sand} d="M0 96 Q300 84 600 92 T1200 88 V120 H0Z" />
          <g className={styles.wash}>
            <path className={styles.water} d="M0 78 Q200 70 400 80 T800 78 T1200 80 V120 H0Z" />
            <path className={styles.foam} d="M0 78 Q200 70 400 80 T800 78 T1200 80" />
          </g>
          <g className={styles.wash2}>
            <path
              className={styles.water}
              d="M0 84 Q150 78 300 86 T600 84 T900 86 T1200 84 V120 H0Z"
            />
            <path className={styles.foam} d="M0 84 Q150 78 300 86 T600 84 T900 86 T1200 84" />
          </g>
        </svg>
      </span>
      <span className={styles.examFox} aria-hidden="true">
        <Dressed
          face={face}
          outfit={{ ...outfit, head: wearing("Graduation cap").head }}
          size={84}
        />
      </span>
      {/* a phone has room for the short name only */}
      <h2>
        <span className={styles.long}>Full-length exam</span>
        <span className={styles.short}>Exam</span> {number}
      </h2>
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
