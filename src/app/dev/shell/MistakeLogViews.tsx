"use client";

// The pieces the Mistake Log is made of (MistakeLog.tsx):
//   Sifts          the four menus that narrow the log: kind of work, section, domain, skill. They are
//                  the phone's own menus, so they open the way every other menu on the phone does.
//   QuestionRow    one question in a list, with a mark for correct or missed, and a small bookmark
//                  and flag when it carries them.
//   SessionView    one sitting: what it was, how it went, and its questions (all, correct, missed).
//   QuestionView   one past question: the student's answer, the right answer and the explanation.
//                  There is no retry here (founder, 2026-11-15).
// The words are "correct" and "missed", never "incorrect" (founder, 2026-11-15).
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import lib from "./library.module.css";
import type { Found } from "./progressBreakdowns";
import { dateOf, type Student } from "./progressData";
import {
  MODES,
  MODES_MANY,
  type Asked,
  type Mode,
  type Session,
  type Sift,
} from "./mistakeLogData";
import styles from "./mistakeLog.module.css";
import { clock, minSec } from "./progressStats";
import { SECTIONS, SKILLS, type Section } from "./skills72";
import { tick } from "./sound";

export const dayName = (student: Student, day: number) =>
  day === student.days
    ? "Today"
    : day === student.days - 1
      ? "Yesterday"
      : dateOf(student, day).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

const DOMAINS = SECTIONS.flatMap((section) =>
  SKILLS[section].map((domain) => ({ section, name: domain.name, skills: domain.skills }))
);

export function Sifts({ sift, onSift }: { sift: Sift; onSift: (next: Sift) => void }) {
  const domains = DOMAINS.filter((d) => !sift.section || d.section === sift.section);
  const skilled = domains.filter((d) => !sift.domain || d.name === sift.domain);
  const menu = (label: string, value: string, set: (value: string) => void, body: ReactNode) => (
    <span className={styles.pick} data-on={value !== "" || undefined}>
      <select aria-label={label} value={value} onChange={(e) => set(e.target.value)}>
        {body}
      </select>
    </span>
  );
  return (
    <div className={styles.sift} role="group" aria-label="Narrow the log">
      {menu(
        "Kind of work",
        sift.mode ?? "",
        (v) => onSift({ ...sift, mode: (v || null) as Mode | null }),
        <>
          <option value="">All work</option>
          {(Object.keys(MODES_MANY) as Mode[]).map((mode) => (
            <option key={mode} value={mode}>
              {MODES_MANY[mode]}
            </option>
          ))}
        </>
      )}
      {menu(
        "Section",
        sift.section ?? "",
        (v) => {
          const section = (v || null) as Section | null;
          // a domain or skill of the other section no longer fits
          const keep =
            !section || DOMAINS.some((d) => d.name === sift.domain && d.section === section);
          onSift({
            ...sift,
            section,
            domain: keep ? sift.domain : null,
            skill: keep ? sift.skill : null,
          });
        },
        <>
          <option value="">All sections</option>
          {SECTIONS.map((section) => (
            <option key={section}>{section}</option>
          ))}
        </>
      )}
      {menu(
        "Domain",
        sift.domain ?? "",
        (v) => {
          const domain = DOMAINS.find((d) => d.name === v);
          const keep = !domain || domain.skills.some((s) => s.name === sift.skill);
          onSift({
            ...sift,
            section: domain?.section ?? sift.section,
            domain: domain?.name ?? null,
            skill: keep ? sift.skill : null,
          });
        },
        <>
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </>
      )}
      {menu(
        "Skill",
        sift.skill ?? "",
        (v) => {
          const domain = DOMAINS.find((d) => d.skills.some((s) => s.name === v));
          onSift({
            ...sift,
            section: domain?.section ?? sift.section,
            domain: domain?.name ?? sift.domain,
            skill: v || null,
          });
        },
        <>
          <option value="">All skills</option>
          {skilled.map((d) => (
            <optgroup key={d.name} label={d.name}>
              {d.skills.map((s) => (
                <option key={s.name}>{s.name}</option>
              ))}
            </optgroup>
          ))}
        </>
      )}
    </div>
  );
}

const Chevron = ({ back = false }: { back?: boolean }) => (
  <svg className={styles.chev} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d={back ? "M14.500 6.500L9 12l5.500 5.500" : "M9.500 6.500l5.500 5.500-5.500 5.500"} />
  </svg>
);

/** Correct or missed, told by shape as well as by color. */
export function Mark({ right }: { right: boolean }) {
  return (
    <svg
      className={styles.mark}
      data-right={right}
      viewBox="0 0 20 20"
      width="20"
      height="20"
      role="img"
      aria-label={right ? "Correct" : "Missed"}
    >
      <circle cx="10" cy="10" r="9" />
      <path d={right ? "M6 10.300l2.700 2.700L14 7.500" : "M7 7l6 6M13 7l-6 6"} />
    </svg>
  );
}

export const Bookmark = ({ size = 16 }: { size?: number }) => (
  <svg className={styles.sign} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M7 4.500h10v15.500l-5-3.800-5 3.800z" />
  </svg>
);
export const Flag = ({ size = 16 }: { size?: number }) => (
  <svg className={styles.sign} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M6.500 20.500v-16M6.500 5h11l-2.400 3.600 2.400 3.600h-11" />
  </svg>
);

export type Marked = { bookmarked: boolean; flagged: boolean };

export function QuestionRow({
  q,
  name,
  small,
  marked,
  flags,
  current,
  onOpen,
}: {
  q: Asked;
  name: string;
  small?: string;
  marked: Marked;
  /** Whether this student can flag questions for a tutor (Cohort and Private). */
  flags: boolean;
  current: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={styles.row}
        data-q
        aria-current={current || undefined}
        onClick={onOpen}
      >
        <Mark right={q.right} />
        <span className={styles.what}>
          <b>{name}</b>
          {small && <small>{small}</small>}
        </span>
        <span className={styles.signs}>
          {flags && marked.flagged && (
            <span role="img" aria-label="Flagged for your tutor">
              <Flag />
            </span>
          )}
          {marked.bookmarked && (
            <span role="img" aria-label="Bookmarked">
              <Bookmark />
            </span>
          )}
        </span>
        <span className={styles.took}>{minSec(q.seconds)}</span>
        <Chevron />
      </button>
    </li>
  );
}

export const WITHIN = ["All", "Correct", "Missed"] as const;
export type Within = (typeof WITHIN)[number];
export const within = (asked: Asked[], shown: Within) =>
  shown === "All" ? asked : asked.filter((q) => q.right === (shown === "Correct"));

export function SessionView({
  student,
  session,
  shown,
  onShown,
  markOf,
  flags,
  named,
  onOpen,
}: {
  student: Student;
  session: Session;
  /** Whether the page's own title already names this sitting (a phone): it is not said twice. */
  named: boolean;
  shown: Within;
  onShown: (shown: Within) => void;
  markOf: (q: Asked) => Marked;
  flags: boolean;
  onOpen: (q: Asked) => void;
}) {
  const still = useReducedMotion() ?? false;
  const many = session.asked.length;
  // a choice between correct and missed only says something when the sitting has both
  const mixed = session.right > 0 && session.right < many;
  const rows = within(session.asked, mixed ? shown : "All");
  return (
    <>
      <header className={styles.head}>
        {!named && <h2>{session.name}</h2>}
        <p className={styles.when}>
          {session.mode === "skill" && `${MODES.skill}, `}
          {dayName(student, session.day)}
        </p>
      </header>
      <div className={styles.facts}>
        {session.score !== undefined && (
          <div className={styles.fact}>
            <b>{session.score}</b>Score
          </div>
        )}
        <div className={styles.fact}>
          <b>
            {session.right} of {many}
          </b>
          Correct
        </div>
        <div className={styles.fact}>
          <b>
            {session.seconds >= 3600
              ? clock(Math.round(session.seconds / 60))
              : minSec(session.seconds)}
          </b>
          Time
        </div>
        {many > 1 && (
          <div className={styles.fact}>
            <b>{minSec(session.seconds / many)}</b>Pace
          </div>
        )}
      </div>
      {mixed && (
        <div className={`${lib.filter} ${styles.lenses}`} role="group" aria-label="Questions shown">
          {WITHIN.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={shown === name}
              onClick={() => {
                onShown(name);
                tick();
              }}
            >
              {shown === name && (
                <motion.span
                  layoutId="mistakes-within"
                  className={lib.lens}
                  transition={
                    still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                  }
                />
              )}
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
      <ul className={styles.rows}>
        {rows.map((q) => (
          <QuestionRow
            key={q.id}
            q={q}
            name={`Question ${q.number}`}
            small={session.mode === "skill" ? undefined : q.found.skill.name}
            marked={markOf(q)}
            flags={flags}
            current={false}
            onOpen={() => onOpen(q)}
          />
        ))}
      </ul>
    </>
  );
}

export function QuestionView({
  student,
  q,
  marked,
  flags,
  named,
  back,
  onMark,
  onStep,
  onSkill,
}: {
  student: Student;
  q: Asked;
  /** Whether the page's own title already names this question (a phone): it is not said twice. */
  named: boolean;
  marked: Marked;
  flags: boolean;
  /** The way back to the sitting, when the list it came from is not on the screen beside it. */
  back?: { label: string; go: () => void };
  onMark: (next: Marked) => void;
  /** Goes to the question before or after this one in the list it was opened from, if there is one. */
  onStep: { before?: () => void; after?: () => void };
  onSkill: (found: Found) => void;
}) {
  const { sample } = q;
  return (
    <>
      {back && (
        <button type="button" className={styles.backIn} onClick={back.go}>
          <Chevron back />
          {back.label}
        </button>
      )}
      <header className={styles.qhead}>
        <div className={styles.head}>
          {!named && <h2>Question {q.number}</h2>}
          <p className={styles.when}>
            {q.mode === "skill" ? MODES.skill : q.sessionName}, {dayName(student, q.day)}
          </p>
        </div>
        <div className={styles.tools}>
          {flags && (
            <button
              type="button"
              aria-label="Flag for your tutor"
              title="Flag for your tutor"
              aria-pressed={marked.flagged}
              onClick={() => {
                // a flag keeps the question as a bookmark too
                onMark(
                  marked.flagged
                    ? { ...marked, flagged: false }
                    : { bookmarked: true, flagged: true }
                );
                tick();
              }}
            >
              <Flag size={20} />
            </button>
          )}
          <button
            type="button"
            aria-label="Bookmark"
            title="Bookmark"
            aria-pressed={marked.bookmarked}
            onClick={() => {
              onMark(
                marked.bookmarked
                  ? { bookmarked: false, flagged: false }
                  : { ...marked, bookmarked: true }
              );
              tick();
            }}
          >
            <Bookmark size={20} />
          </button>
          <button
            type="button"
            aria-label="Question before"
            disabled={!onStep.before}
            onClick={onStep.before}
          >
            <Chevron back />
          </button>
          <button
            type="button"
            aria-label="Question after"
            disabled={!onStep.after}
            onClick={onStep.after}
          >
            <Chevron />
          </button>
        </div>
      </header>
      <p className={styles.verdict} data-right={q.right}>
        <Mark right={q.right} />
        <b>{q.right ? "Correct" : "Missed"}</b>
        <span>{minSec(q.seconds)}</span>
      </p>
      <button type="button" className={styles.skill} onClick={() => onSkill(q.found)}>
        {q.found.skill.name}
        <Chevron />
      </button>
      <p className={styles.prompt}>{sample.prompt}</p>
      <ol className={styles.choices}>
        {sample.choices.map((choice, i) => {
          const mine = i === q.picked;
          const answer = i === sample.answer;
          return (
            <li key={choice} data-is={answer ? "right" : mine ? "missed" : undefined}>
              <i>{"ABCD"[i]}</i>
              <span>{choice}</span>
              {(mine || answer) && <b>{mine ? "Your answer" : "Right answer"}</b>}
            </li>
          );
        })}
      </ol>
      <div className={styles.why}>
        <h3>Explanation</h3>
        <p>{sample.why}</p>
      </div>
    </>
  );
}
