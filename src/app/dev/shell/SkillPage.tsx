"use client";

// One skill's page (step 3 of the portal rebuild, second screen). In the founder's order (2026-11-14):
// the mastery level first, then the video and the written lesson, then practice, called skill sets.
// The same glass, inset and warm level colours as the Library. Everything shown is a stand-in: no
// student data, lesson or question is read yet, and the buttons lead nowhere.
import type { CSSProperties } from "react";
import lib from "./library.module.css";
import styles from "./skill.module.css";

const STEPS = ["Learning", "Understanding", "Proficient"] as const;

export interface OpenSkill {
  name: string;
  level: number;
  domain: string;
  /** What the skill tests, in a line. */
  tests?: string;
}

/** Stand-in skill sets: the ones before the level are done, the next one is up. */
const sets = (level: number) =>
  [1, 2, 3].map(
    (n) => ({ n, state: n <= level ? "done" : n === level + 1 ? "next" : "later" }) as const
  );

export default function SkillPage({ skill }: { skill: OpenSkill }) {
  const next = sets(skill.level).find((s) => s.state === "next");
  return (
    <div className={`${lib.library} ${styles.page}`}>
      {/* 1. where the student stands */}
      <section className={`${lib.glass} ${styles.level}`} style={{ "--i": 0 } as CSSProperties}>
        <h2>{skill.level === 0 ? "Not started" : STEPS[skill.level - 1]}</h2>
        <ol
          className={styles.ladder}
          data-level={skill.level}
          aria-label={`Level ${skill.level} of 3`}
        >
          {STEPS.map((name, i) => (
            <li
              key={name}
              data-on={skill.level > i || undefined}
              data-here={skill.level === i + 1 || undefined}
            >
              <i style={{ "--s": i } as CSSProperties} />
              {name}
            </li>
          ))}
        </ol>
        {skill.tests && <p className={styles.tests}>{skill.tests}</p>}
        <p>A skill moves up as you get it right, and slips back a step if you miss it later.</p>
      </section>

      {/* 2. the lesson */}
      <section className={`${lib.glass} ${styles.lesson}`} style={{ "--i": 1 } as CSSProperties}>
        <div className={styles.video}>
          <span className={styles.play} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path d="M9 6.500v11l9-5.500z" />
            </svg>
          </span>
          <p>
            Video lesson
            <small>Coming this winter</small>
          </p>
        </div>
        <button type="button" className={styles.read}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M7 3.500h7l4.500 4.500v10.500a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
            <path d="M14 3.500V8h4.500M8.500 12h7M8.500 15.500h5" />
          </svg>
          Read the lesson
          <svg
            className={styles.chev}
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
          </svg>
        </button>
      </section>

      {/* 3. practice */}
      <section className={`${lib.glass} ${styles.sets}`} style={{ "--i": 2 } as CSSProperties}>
        <h2>Skill sets</h2>
        <ul>
          {sets(skill.level).map((set) => (
            <li key={set.n} data-state={set.state}>
              <i aria-hidden="true">
                {set.state === "done" && (
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M5.500 12.500l4.200 4.200 8.800-9.400" />
                  </svg>
                )}
              </i>
              Skill set {set.n}
              <small>{set.state === "done" ? "Done" : set.state === "next" ? "Up next" : ""}</small>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.go}>
          {next ? `Start skill set ${next.n}` : "Practise again"}
        </button>
      </section>
    </div>
  );
}
