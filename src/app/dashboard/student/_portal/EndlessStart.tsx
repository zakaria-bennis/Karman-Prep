"use client";

// Endless mode's start page (founder, 2026-11-21), in the Daily 10's layout (dailyStart.module.css).
// It draws from wherever it was started (endless.ts): one skill, one domain (leaning on the
// student's weakest skills there) or a whole section. The feeling is flow:
//   Left    a live river seen from just above the water (founder's pick, 2026-11-21: "A, on the
//           water"), the real landscape alone, with no sign or character over it; under it the name
//           of what the run draws from; and their best run in a card of its own.
//   Right   the rules, a fact each: three misses end the run, and where the questions come from;
//           then one green Start.
// Never skipped; nothing starts until Start. A signed-in student's best run is their own, and Start
// plays the run over the page (play/PlayLayer.tsx); the design page shows stand-ins and plays
// eight made-up questions.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RIVER_LANDS } from "@/lib/flight/world";
import { prefersStill } from "@/lib/painting/motion";
import { actionEndlessBest } from "@/app/learn/play-actions";
import go from "./play/go.module.css";
import { CIRCLES } from "./play/demo-questions";
import { usePlay } from "./play/PlayLayer";
import { scopeOf, TrialStart } from "./TrialStart";
import { type EndlessRun } from "./endless";

export { useEndlessTrail } from "./endless";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./dailyStart.module.css";
import { usePortalData } from "./portalData";
import own from "./endlessStart.module.css";
import { WorldWindow } from "./WorldWindow";

/** Stand-ins: the longest run this student has had here, and when. */
const BEST = 27;
const BEST_WHEN = "Nov 18";

const KIND = { skill: "Skill", domain: "Domain", section: "Section" } as const;
const FROM = {
  skill: (name: string) => `Only ${name}`,
  domain: () => "Your weakest skills most",
  section: (name: string) => `All of ${name}`,
} as const;

/** Where down the river this run's picture starts: each skill, domain or section has its own stretch. */
function riverFrom(name: string) {
  let h = 7;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return 40 + (h % 89) * 5;
}

function Lives() {
  return (
    <span className={own.lives} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="22" height="22">
          <path d="M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 5.600-7 10-7 10Z" />
        </svg>
      ))}
    </span>
  );
}

/** Endless mode's start page, or a time trial's (the same store opens both, endless.ts). */
export function EndlessStart({ run }: { run: EndlessRun }) {
  return run.mode === "trial" ? <TrialStart run={run} /> : <EndlessPage run={run} />;
}

function EndlessPage({ run }: { run: EndlessRun }) {
  const real = usePortalData() !== null;
  const scope = scopeOf(run);
  const button = useRef<HTMLButtonElement>(null);
  const { layer, play } = usePlay();
  const [best, setBest] = useState<{ run: number; when: string | null } | null>(
    real ? null : { run: BEST, when: BEST_WHEN }
  );
  useEffect(() => {
    if (!real || !scope) return;
    let live = true;
    actionEndlessBest({ scope })
      .then((r) => {
        if (!live || !r.ok) return;
        const when = r.value.when
          ? new Date(r.value.when).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : null;
        setBest({ run: r.value.run, when });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, run.kind, run.name]);
  const start = () =>
    real && scope
      ? play({ kind: "endless", scope }, button.current)
      : play({ kind: "demo", title: run.name, questions: CIRCLES }, button.current);
  const ref = useRef<HTMLDivElement>(null);
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
    }, el);
    return () => ctx.revert();
  }, [run.kind, run.name]);
  const how = [
    { icon: <Lives />, words: "3 misses end the run" },
    { icon: <Icon name="go" size={28} />, words: FROM[run.kind](run.name) },
  ];
  return (
    <div ref={ref} className={`${lib.library} ${styles.page}`}>
      <div className={styles.left}>
        <section className={`${lib.glass} ${styles.today}`} data-rise>
          <div className={styles.window}>
            <WorldWindow from={riverFrom(run.name)} lands={RIVER_LANDS} river />
          </div>
          <div className={styles.hello}>
            <h2>{run.name}</h2>
            <p>{KIND[run.kind]} endless</p>
          </div>
        </section>

        {/* the best run, in a card of its own */}
        <section className={`${lib.glass} ${styles.streak}`} data-rise>
          <span className={`${styles.flame} ${own.medal}`} aria-hidden="true">
            <Icon name="endless" size={34} />
          </span>
          <p>
            <b>{best && best.run > 0 ? `${best.run} in a row` : "No run yet"}</b>
            <small>Your best run</small>
          </p>
          {best?.when && best.run > 0 && (
            <p className={styles.best}>
              <small>Set on</small>
              <b>{best.when}</b>
            </p>
          )}
        </section>
      </div>

      <section className={`${lib.glass} ${styles.mix}`} data-rise>
        <h2>Rules</h2>
        <ul className={own.how}>
          {how.map((h) => (
            <li key={h.words} data-how>
              <span className={own.mark}>{h.icon}</span>
              <b>{h.words}</b>
            </li>
          ))}
        </ul>
        <button ref={button} type="button" className={`${go.go} ${styles.start}`} onClick={start}>
          <span>Start endless</span>
          <Icon name="go" size={20} />
        </button>
      </section>
      {layer}
    </div>
  );
}
