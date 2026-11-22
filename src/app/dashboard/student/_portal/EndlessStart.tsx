"use client";

// Endless mode's start page (founder, 2026-11-21), in the Daily 10's layout (dailyStart.module.css).
// It draws from wherever it was started (endless.ts): one skill, one domain (leaning on the
// student's weakest skills there) or a whole section. The feeling is flow:
//   Left    a live river seen from just above the water (founder's pick, 2026-11-21: "A, on the
//           water"), the real landscape alone, with no sign or character over it; under it the name
//           of what the run draws from; and their best run in a card of its own.
//   Right   how it goes: questions keep coming, three misses end the run, and where they come from;
//           then one green Start.
// Never skipped; nothing starts until Start. Stand-ins: no student data is read.
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { RIVER_LANDS } from "@/lib/flight/world";
import { prefersStill } from "@/lib/painting/motion";
import go from "@/app/dev/end-options/parts.module.css";
import { closeEndless, type EndlessRun } from "./endless";

export { useEndlessTrail } from "./endless";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./dailyStart.module.css";
import { usePortalData, useSkills } from "./portalData";
import { SECTIONS, type Section } from "./skills72";
import { catalogSkillOf } from "@/lib/portal/skill-bridge";
import { practiceSet } from "@/lib/student/quiz-routes";
import own from "./endlessStart.module.css";
import { WorldWindow } from "./WorldWindow";

/** Stand-ins: the longest run this student has had here, and when. */
const BEST = 27;
const BEST_WHEN = "Nov 18";

const KIND = { skill: "Skill", domain: "Domain", section: "Section" } as const;
const FROM = {
  skill: (name: string) => [`Only ${name}`, "Every question is from this skill."],
  domain: () => ["Leans on your weakest skills", "More of the skills you know least here."],
  section: (name: string) => ["From every domain", `Questions from all of ${name}.`],
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

export function EndlessStart({ run }: { run: EndlessRun }) {
  /* a signed-in student's run is a skill set on the live quiz page: on this skill, or on the
     weakest skill of this domain or side, as the old endless mode chose each round */
  const real = usePortalData() !== null;
  const skills = useSkills();
  const start = () => {
    if (!real) return closeEndless();
    const pool =
      run.kind === "skill"
        ? [run.name]
        : (run.kind === "section"
            ? skills[run.name as Section].flatMap((d) => d.skills)
            : (SECTIONS.flatMap((s) => skills[s]).find((d) => d.name === run.name)?.skills ?? [])
          )
            .filter((k) => k.level < 3)
            .sort((a, b) => a.level - b.level)
            .map((k) => k.name);
    const catalog = catalogSkillOf(pool[0] ?? run.name);
    if (catalog) window.location.assign(practiceSet(catalog).path);
    else closeEndless();
  };
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
  const [from, fromWhy] = FROM[run.kind](run.name);
  const how = [
    {
      icon: <Icon name="endless" size={40} />,
      words: "Questions keep coming",
      why: "No set length. See how far you can go.",
    },
    { icon: <Lives />, words: "Three misses end the run", why: "Each miss takes a heart." },
    { icon: <Icon name="go" size={28} />, words: from, why: fromWhy },
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
            <b>{BEST} in a row</b>
            <small>Your best run</small>
          </p>
          <p className={styles.best}>
            <small>Set on</small>
            <b>{BEST_WHEN}</b>
          </p>
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
        {/* until the endless quiz is joined up, Start comes back to where the run began */}
        <button type="button" className={`${go.go} ${styles.start}`} onClick={start}>
          <span>Start endless</span>
          <Icon name="go" size={20} />
        </button>
      </section>
    </div>
  );
}
