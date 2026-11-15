"use client";

// One skill's page. Opening a skill slides this in over the Library (page.tsx), and everything on it is
// about that one skill (founder, 2026-11-15: "the focus is mainly put on that particular skill").
// In his order: where the student stands, then the lesson, then practice.
// Skill sets are never numbered: a student may do many, so the button only ever says "Start skill set".
// The same glass, inset and level colours as the Library. Everything shown is a stand-in: no student
// data, lesson or question is read yet, and the buttons lead nowhere.
import type { CSSProperties } from "react";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./skill.module.css";

const STEPS = ["Learning", "Understanding", "Proficient"] as const;
/** Right answers a skill set needs to move a skill up to each level (founder, 2026-11-15). */
const TO_PASS = [3, 4, 5];

export interface OpenSkill {
  name: string;
  level: number;
  domain: string;
  /** What the skill tests, in a line. */
  tests?: string;
  /** How many questions the Library holds for it. */
  questions?: number;
}

export default function SkillPage({ skill }: { skill: OpenSkill }) {
  const top = skill.level === STEPS.length;
  return (
    <div className={`${lib.library} ${styles.page}`}>
      {/* 1. where the student stands, and what the next skill set is for */}
      <section className={`${lib.glass} ${styles.level}`} style={{ "--i": 0 } as CSSProperties}>
        {skill.tests && <p className={styles.tests}>{skill.tests}</p>}
        <ol
          className={styles.ladder}
          aria-label={skill.level === 0 ? "Not started" : STEPS[skill.level - 1]}
        >
          {STEPS.map((name, i) => (
            <li
              key={name}
              data-step={i + 1}
              data-on={skill.level > i || undefined}
              data-here={skill.level === i + 1 || undefined}
            >
              <i style={{ "--s": i } as CSSProperties} />
              {name}
            </li>
          ))}
        </ol>
        <p className={styles.rule}>
          {top
            ? "You are Proficient here. Keep it: a missed skill set can move it back a level."
            : `A skill set is 8 questions. Get ${TO_PASS[skill.level]} right to move up to ${STEPS[skill.level]}.`}
        </p>
        <button type="button" className={styles.go}>
          {top ? "Practise a skill set" : "Start skill set"}
        </button>
        {skill.questions !== undefined && (
          <p className={lib.bank}>{skill.questions} questions in this skill</p>
        )}
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
        <button type="button" className={styles.row}>
          <Icon name="exam" />
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

      {/* 3. other ways to practise this one skill */}
      <section className={`${lib.glass} ${styles.more}`} style={{ "--i": 2 } as CSSProperties}>
        <h2>More practice on this skill</h2>
        {(
          [
            ["trial", "Time trial", "Speed and accuracy, on the clock."],
            ["endless", "Endless mode", "Keep going until you stop."],
          ] as const
        ).map(([icon, name, what]) => (
          <button key={name} type="button" className={styles.row}>
            <Icon name={icon} />
            <span>
              {name}
              <small>{what}</small>
            </span>
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
        ))}
      </section>
    </div>
  );
}
