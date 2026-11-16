"use client";

// One skill's page. Opening a skill slides this in over the Library (page.tsx), and everything on it is
// about that one skill. In the founder's order: where the student stands, then the lesson, then practice.
// Skill sets are never numbered, and the rule for moving up is not spelled out here (founder, 2026-11-15:
// "an unnecessary detail"). The lesson has two forms, written and video, with written shown first.
// Everything shown is a stand-in: no student data, lesson or question is read yet.
import { motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import lib from "./library.module.css";
import { GoButton, Icon, Tile } from "./practice";
import practice from "./practice.module.css";
import styles from "./skill.module.css";

const STEPS = ["Learning", "Understanding", "Proficient"] as const;
const LESSONS = { written: "Written lesson", video: "Video lesson" } as const;
type Lesson = keyof typeof LESSONS;

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
  const still = useReducedMotion() ?? false;
  const [lesson, setLesson] = useState<Lesson>("written");
  return (
    <div className={`${lib.library} ${styles.page}`}>
      {/* 1. where the student stands, and the one thing to do */}
      <section className={`${lib.glass} ${styles.level}`}>
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
        <GoButton wide>Start skill set</GoButton>
        {skill.questions !== undefined && (
          <p className={lib.bank}>{skill.questions} questions in this skill</p>
        )}
      </section>

      {/* 2. the lesson: written or video */}
      <section className={`${lib.glass} ${styles.lesson}`}>
        <div className={styles.toggle} role="group" aria-label="Lesson">
          {(Object.keys(LESSONS) as Lesson[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={lesson === key}
              onClick={() => setLesson(key)}
            >
              {lesson === key && (
                <motion.span
                  layoutId="lesson-toggle"
                  className={styles.lens}
                  transition={
                    still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                  }
                />
              )}
              <span>
                <Icon name={key} size={18} />
                {LESSONS[key]}
              </span>
            </button>
          ))}
        </div>
        {lesson === "written" ? (
          <article className={styles.written}>
            <h2>{skill.name}</h2>
            {skill.tests && <p>{skill.tests}</p>}
            {["What it is", "How to spot it", "A worked example"].map((part) => (
              <div key={part}>
                <h3>{part}</h3>
                <i />
                <i />
                <i />
              </div>
            ))}
            <p className={lib.bank}>This lesson is being written.</p>
          </article>
        ) : (
          <div className={styles.video}>
            <span className={styles.play} aria-hidden="true">
              <Icon name="video" size={28} />
            </span>
            <p>
              Video lesson
              <small>Coming this winter</small>
            </p>
          </div>
        )}
      </section>

      {/* 3. other ways to practise this one skill */}
      <section className={`${lib.glass} ${styles.more}`}>
        <h2>More practice on this skill</h2>
        {(
          [
            ["trial", "Time trial"],
            ["endless", "Endless mode"],
          ] as const
        ).map(([icon, name]) => (
          <button key={name} type="button" className={`${practice.mode} ${styles.row}`}>
            <Tile name={icon} />
            <b>{name}</b>
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
