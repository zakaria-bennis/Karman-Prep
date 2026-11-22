"use client";

// A time trial's start page (founder, 2026-11-20: time trials feel "hyped"). Opened from a skill's
// page, a domain or a section (the same store as endless mode, endless.ts), in the Daily 10's layout:
//   Left    the racing stopwatch, flames off its back, in its window; the name of what the trial is
//           on and its round; and the pace, a track of notches from 1.25 times the SAT's time down to
//           0.75, with this round lit.
//   Right   how it goes: the questions and the clock, the accuracy to hold for the next round to be
//           faster, and what the results show; then one green Start, and a count of three before
//           the first question.
// Never skipped; nothing starts until Start. A signed-in student's round is read from the server;
// the design page shows round 1.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { formatClock, TRIAL_FLOOR, TRIAL_START, TRIAL_STEP } from "@/lib/student/time-trial";
import { SKILLS72 } from "@/lib/skills/ids72";
import type { PlayScope } from "@/lib/play/types";
import { actionTrialStanding } from "@/app/learn/play-actions";
import { closeEndless, type EndlessRun } from "./endless";
import lib from "./library.module.css";
import { Icon } from "./practice";
import { usePortalData } from "./portalData";
import { usePlay } from "./play/PlayLayer";
import go from "./play/go.module.css";
import styles from "./dailyStart.module.css";
import own from "./endlessStart.module.css";
import t from "./trialStart.module.css";

const KIND = { skill: "Skill", domain: "Domain", section: "Section" } as const;
const NOTCHES = Math.round((TRIAL_START - TRIAL_FLOOR) / TRIAL_STEP) + 1;

/** The scope a start page's run stands for. */
export function scopeOf(run: EndlessRun): PlayScope | null {
  if (run.kind === "section")
    return run.name === "Math" || run.name === "Reading and Writing"
      ? { kind: "section", section: run.name }
      : null;
  if (run.kind === "domain") return { kind: "domain", domain: run.name };
  const skill = SKILLS72.find((s) => s.name === run.name);
  return skill ? { kind: "skill", skillId: skill.id } : null;
}

type Standing = {
  round: number;
  multiplier: number;
  bar: number;
  questions: number;
  seconds: number;
};

export function TrialStart({ run }: { run: EndlessRun }) {
  const real = usePortalData() !== null;
  const scope = scopeOf(run);
  const { layer, play } = usePlay();
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const [standing, setStanding] = useState<Standing>({
    round: 1,
    multiplier: TRIAL_START,
    bar: 0.75,
    questions: run.kind === "skill" ? 8 : run.kind === "domain" ? 12 : 27,
    seconds: Math.round((run.kind === "skill" ? 8 : 12) * 71 * TRIAL_START),
  });
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!real || !scope) return;
    let live = true;
    actionTrialStanding({ scope })
      .then((r) => {
        if (!live || !r.ok) return;
        const s = r.value.start;
        setStanding({
          round: s.round,
          multiplier: s.multiplier,
          bar: Math.max(0, s.baseline.accuracy - 0.05),
          questions: r.value.questions,
          seconds: r.value.seconds,
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, run.kind, run.name]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersStill()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.07 }
      );
      gsap.fromTo(
        "[data-how]",
        { x: 18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", stagger: 0.08, delay: 0.35 }
      );
      // the notches light up to this round, fast, like a rev counter
      gsap.fromTo(
        "[data-notch]",
        { scaleY: 0.2, opacity: 0.2 },
        { scaleY: 1, opacity: 1, duration: 0.25, ease: "back.out(3)", stagger: 0.035, delay: 0.5 }
      );
    }, el);
    return () => ctx.revert();
  }, [run.kind, run.name]);

  // three, two, one: then the quiz
  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      if (scope && real) play({ kind: "trial", scope }, start.current);
      else closeEndless();
      return;
    }
    const tick = window.setTimeout(() => setCount((n) => (n === null ? null : n - 1)), 650);
    return () => window.clearTimeout(tick);
  }, [count, scope, real, play]);

  const here = Math.round((TRIAL_START - standing.multiplier) / TRIAL_STEP);
  const how = [
    {
      icon: <Icon name="trial" size={58} />,
      words: `${standing.questions} questions, ${formatClock(standing.seconds)} on the clock`,
      why: `${standing.multiplier.toFixed(2)}× the SAT's own time.`,
    },
    {
      icon: <span className={t.bar}>{Math.round(standing.bar * 100)}%</span>,
      words: "Hold your accuracy",
      why: `Get ${Math.round(standing.bar * 100)}% or more and the next round is 5% faster.`,
    },
    {
      icon: <Icon name="go" size={28} />,
      words: "Speed, accuracy and pacing",
      why: "Then review what you missed.",
    },
  ];
  return (
    <div ref={ref} className={`${lib.library} ${styles.page} ${t.page}`}>
      <div className={styles.left}>
        <section className={`${lib.glass} ${styles.today}`} data-rise>
          <div className={`${styles.window} ${t.window}`}>
            <span className={t.watch} aria-hidden="true">
              <Icon name="trial" size={180} />
            </span>
          </div>
          <div className={styles.hello}>
            <h2>{run.name}</h2>
            <p>
              {KIND[run.kind]} time trial · Round {standing.round}
            </p>
          </div>
        </section>

        <section className={`${lib.glass} ${styles.streak} ${t.pace}`} data-rise>
          <p>
            <b>{standing.multiplier.toFixed(2)}× time</b>
            <small>Down to 0.75× as you get faster</small>
          </p>
          <ol className={t.track} aria-label={`Pace ${here + 1} of ${NOTCHES}`}>
            {Array.from({ length: NOTCHES }, (_, i) => (
              <li
                key={i}
                data-notch
                data-past={i < here || undefined}
                data-here={i === here || undefined}
              />
            ))}
          </ol>
        </section>
      </div>

      <section className={`${lib.glass} ${styles.mix}`} data-rise>
        <h2>How it goes</h2>
        <ul className={own.how}>
          {how.map((h) => (
            <li key={h.words} data-how>
              <span className={own.mark}>{h.icon}</span>
              <span>
                <b>{h.words}</b>
                <small>{h.why}</small>
              </span>
            </li>
          ))}
        </ul>
        <button
          ref={start}
          type="button"
          className={`${go.go} ${styles.start} ${t.start}`}
          onClick={() => setCount(prefersStill() ? 0 : 3)}
        >
          <span>Start time trial</span>
          <Icon name="go" size={20} />
        </button>
      </section>

      {count !== null && count > 0 && (
        <div className={t.count} aria-live="assertive">
          <b key={count}>{count}</b>
        </div>
      )}
      {layer}
    </div>
  );
}
