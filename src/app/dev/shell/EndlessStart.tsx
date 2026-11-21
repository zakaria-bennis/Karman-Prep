"use client";

// Endless mode's start page (founder, 2026-11-21), in the Daily 10's layout (dailyStart.module.css).
// It draws from wherever it was started (endless.ts): one skill, one domain (leaning on the
// student's weakest skills there) or a whole section. The feeling is flow:
//   Left    the endless sign, drawn large, with light flowing round it without end, and the
//           student's own character, dressed as they have it, at its crossing; under it the name of
//           what the run draws from; and their best run in a card of its own.
//   Right   how it goes: questions keep coming, three misses end the run, and where they come from;
//           then one green Start.
// Never skipped; nothing starts until Start. Stand-ins: no student data is read.
import gsap from "gsap";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { prefersStill } from "@/lib/painting/motion";
import go from "../end-options/parts.module.css";
import { closeEndless, type EndlessRun } from "./endless";
import { Buddy } from "./HomeworkBuddy";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./dailyStart.module.css";
import own from "./endlessStart.module.css";

/** Stand-ins: the longest run this student has had here, and when. */
const BEST = 27;
const BEST_WHEN = "Nov 18";

const KIND = { skill: "Skill", domain: "Domain", section: "Section" } as const;
const FROM = {
  skill: (name: string) => [`Only ${name}`, "Every question is from this skill."],
  domain: () => ["Leans on your weakest skills", "More of the skills you know least here."],
  section: (name: string) => ["From every domain", `Questions from all of ${name}.`],
} as const;

/** The endless sign: a figure eight on its side, as one path, centered at 0, 0. */
const LOOP =
  "M0 0 C40 -64 150 -64 150 0 C150 64 40 64 0 0 C-40 -64 -150 -64 -150 0 C-150 64 -40 64 0 0Z";

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
  const ref = useRef<HTMLDivElement>(null);
  const [small, setSmall] = useState(false);
  useEffect(() => setSmall(window.innerWidth < 600), []);
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
      // the sign draws itself once, then the light keeps flowing round it
      gsap.fromTo(
        "[data-sign]",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut", delay: 0.2 }
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
          <div className={`${styles.window} ${own.window}`}>
            <svg className={own.sign} viewBox="-190 -100 380 200" aria-hidden="true">
              <defs>
                <linearGradient id="endless-flow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ffb84d" />
                  <stop offset="0.5" stopColor="#ff7a9a" />
                  <stop offset="1" stopColor="#7ab8ff" />
                </linearGradient>
              </defs>
              {/* the sign's path, faint, and the same path drawn in bright light over it */}
              <path d={LOOP} className={own.track} />
              <path d={LOOP} className={own.drawn} pathLength={1} data-sign />
              {/* light flowing round it, three pulses a step apart */}
              {[0, 1, 2].map((i) => (
                <path
                  key={i}
                  d={LOOP}
                  className={own.pulse}
                  pathLength={1}
                  style={{ animationDelay: `${-i * 1.6}s` }}
                />
              ))}
            </svg>
            <span className={own.buddy}>
              <Buddy size={small ? 80 : 112} cheer={0} />
            </span>
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
        <button type="button" className={`${go.go} ${styles.start}`} onClick={closeEndless}>
          <span>Start endless</span>
          <Icon name="go" size={20} />
        </button>
      </section>
    </div>
  );
}
