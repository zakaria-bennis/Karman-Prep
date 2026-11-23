"use client";

// The pieces the Mistake Log is made of (MistakeLog.tsx):
//   QuestionRow        one question in a list, with a mark for correct or missed, and a small
//                      bookmark and flag when it carries them.
//   SessionOverview    what opens when a sitting is picked: how it went, at a glance. No questions
//                      are listed here (founder, 2026-11-16: "it does not show questions. Instead, it
//                      shows an overview of that particular session"). Two buttons lead on to them.
//   SessionQuestions   the sitting's questions: all, correct or missed.
//   QuestionView       one past question: the student's answer, the right answer and the
//                      explanation. There is no retry here (founder, 2026-11-15). He likes this
//                      layout and means to build the quiz engine on it (2026-11-16).
// The words are "correct" and "missed", never "incorrect" (founder, 2026-11-15).
import { motion } from "framer-motion";
import { Pips } from "./Library";
import lib from "./library.module.css";
import type { Found } from "./progressBreakdowns";
import { dateOf, type Student } from "./progressData";
import { MODES, type Asked, type Session } from "./mistakeLogData";
import styles from "./mistakeLog.module.css";
import { clock, minSecWords, timeOfDay } from "./progressStats";
import { tick } from "./sound";
import GeneratedMark from "@/components/admin/GeneratedMark";
import MathText from "@/components/learn/MathText";
import QuestionTable from "@/components/learn/QuestionTable";
import FigureChoices from "@/components/learn/figures/FigureChoices";
import { FigureSlot } from "@/components/learn/quiz-shell/FigureSlot";
import { useDrawnChoices } from "./MistakeLogFigure";
import { useGenerated } from "./play/useGenerated";
import { useStill } from "@/lib/painting/useStill";

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

/** How long a sitting took, in words so it is not read as a time of day: minutes and seconds, or
 *  hours and minutes for an exam. */
export const took = (seconds: number) =>
  seconds >= 3600 ? clock(Math.round(seconds / 60)) : minSecWords(seconds);

export const Chevron = ({ back = false }: { back?: boolean }) => (
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

/** The top line of what is open beside the log: a way back a level, and a way to close it. Either
 *  may be missing: a phone has both in the page's own title row. */
export type Ways = { back?: { label: string; go: () => void }; close?: () => void };

function BackIn({ back }: { back: NonNullable<Ways["back"]> }) {
  return (
    <button type="button" className={styles.backIn} onClick={back.go}>
      <Chevron back />
      {back.label}
    </button>
  );
}

function Close({ close }: { close: () => void }) {
  return (
    <button type="button" className={styles.tool} aria-label="Close" title="Close" onClick={close}>
      <svg className={styles.chev} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M7 7l10 10M17 7L7 17" />
      </svg>
    </button>
  );
}

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
        <span className={styles.took}>{minSecWords(q.seconds)}</span>
        <Chevron />
      </button>
    </li>
  );
}

export const WITHIN = ["All", "Correct", "Missed"] as const;
export type Within = (typeof WITHIN)[number];
/** A choice between correct and missed only says something when the sitting has both. */
export const mixedOf = (session: Session) =>
  session.right > 0 && session.right < session.asked.length;
export const within = (session: Session, shown: Within) =>
  shown === "All" || !mixedOf(session)
    ? session.asked
    : session.asked.filter((q) => q.right === (shown === "Correct"));

/** One small square for each question, in the order they were asked: green correct, red missed. */
function Strip({ asked }: { asked: Asked[] }) {
  const right = asked.filter((q) => q.right).length;
  return (
    <p
      className={styles.strip}
      role="img"
      aria-label={`${right} correct, ${asked.length - right} missed`}
    >
      {asked.map((q) => (
        <i key={q.id} data-right={q.right} />
      ))}
    </p>
  );
}

export function SessionOverview({
  student,
  session,
  named,
  ways,
  onQuestions,
  onSkill,
}: {
  student: Student;
  session: Session;
  /** Whether the page's own title already names this sitting (a phone): it is not said twice. */
  named: boolean;
  ways: Ways;
  /** Goes on to the sitting's questions: all of them, or only the missed. */
  onQuestions: (shown: Within) => void;
  onSkill: (found: Found) => void;
}) {
  const many = session.asked.length;
  const sections = [...new Set(session.asked.map((q) => q.found.section))];
  // the skills missed, each once, in the order they were first missed
  const missed = session.asked
    .filter((q) => !q.right)
    .map((q) => q.found)
    .filter((f, i, all) => all.findIndex((x) => x.skill.name === f.skill.name) === i);
  const one = session.mode === "skill" ? session.asked[0].found : null;
  return (
    <>
      <header className={styles.qhead}>
        <div className={styles.head}>
          {!named && <h2>{session.name}</h2>}
          <p className={styles.when}>
            {session.mode === "skill" && `${MODES.skill}, `}
            {dayName(student, session.day)}, {timeOfDay(session.at)}
          </p>
        </div>
        {ways.close && <Close close={ways.close} />}
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
          <b>{took(session.seconds)}</b>
          Time
        </div>
        {many > 1 && (
          <div className={styles.fact}>
            <b>{minSecWords(session.seconds / many)}</b>Pace
          </div>
        )}
      </div>

      {/* the sitting at a glance: each question as a square, a section to a line in an exam */}
      {many > 1 && (
        <div className={styles.part}>
          <h3>Answers</h3>
          {sections.length > 1 ? (
            sections.map((section) => (
              <div key={section} className={styles.lineOf}>
                <span>{section}</span>
                <Strip asked={session.asked.filter((q) => q.found.section === section)} />
              </div>
            ))
          ) : (
            <Strip asked={session.asked} />
          )}
        </div>
      )}

      {one ? (
        <div className={styles.part}>
          <h3>Skill</h3>
          <button type="button" className={styles.link} onClick={() => onSkill(one)}>
            <span>{one.skill.name}</span>
            <Pips level={one.skill.level} />
            <Chevron />
          </button>
        </div>
      ) : (
        missed.length > 0 && (
          <div className={styles.part}>
            <h3>Missed skills</h3>
            <ul className={styles.rows}>
              {missed.slice(0, 6).map((found) => (
                <li key={found.skill.name}>
                  <button type="button" className={styles.link} onClick={() => onSkill(found)}>
                    <span>{found.skill.name}</span>
                    <Pips level={found.skill.level} />
                    <Chevron />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            onQuestions("All");
            tick();
          }}
        >
          View questions
        </button>
        {mixedOf(session) && (
          <button
            type="button"
            className={styles.more}
            onClick={() => {
              onQuestions("Missed");
              tick();
            }}
          >
            Missed only
          </button>
        )}
      </div>
    </>
  );
}

export function SessionQuestions({
  session,
  shown,
  onShown,
  markOf,
  flags,
  ways,
  onOpen,
}: {
  session: Session;
  shown: Within;
  onShown: (shown: Within) => void;
  markOf: (q: Asked) => Marked;
  flags: boolean;
  ways: Ways;
  onOpen: (q: Asked) => void;
}) {
  const still = useStill();
  return (
    <>
      {(ways.back || ways.close) && (
        <div className={styles.qhead}>
          {ways.back ? <BackIn back={ways.back} /> : <span />}
          {ways.close && <Close close={ways.close} />}
        </div>
      )}
      {mixedOf(session) && (
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
        {within(session, shown).map((q) => (
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
  ways,
  onMark,
  onStep,
  onSkill,
}: {
  student: Student;
  q: Asked;
  marked: Marked;
  flags: boolean;
  /** Whether the page's own title already names this question (a phone): it is not said twice. */
  named: boolean;
  ways: Ways;
  onMark: (next: Marked) => void;
  /** Goes to the question before or after this one in the list it was opened from, if there is one. */
  onStep: { before?: () => void; after?: () => void };
  onSkill: (found: Found) => void;
}) {
  const made = useGenerated(q.questionId ?? "");
  const { sample } = q;
  const drawn = useDrawnChoices(sample.figure);
  return (
    <>
      {ways.back && <BackIn back={ways.back} />}
      <header className={styles.qhead}>
        <div className={styles.head}>
          {!named && <h2>Question {q.number}</h2>}
          <p className={styles.when}>
            {q.mode === "skill" ? MODES.skill : q.sessionName}, {dayName(student, q.day)}
            {/* admins only: a question the generator made (checked on the server) */}
            {q.questionId && made[q.questionId] && <GeneratedMark questionId={q.questionId} />}
          </p>
        </div>
        <div className={styles.tools}>
          {flags && (
            <button
              type="button"
              className={styles.tool}
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
            className={styles.tool}
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
            className={styles.tool}
            aria-label="Question before"
            disabled={!onStep.before}
            onClick={onStep.before}
          >
            <Chevron back />
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-label="Question after"
            disabled={!onStep.after}
            onClick={onStep.after}
          >
            <Chevron />
          </button>
          {ways.close && <Close close={ways.close} />}
        </div>
      </header>
      <p className={styles.verdict} data-right={q.right}>
        <Mark right={q.right} />
        <b>{q.right ? "Correct" : "Missed"}</b>
        <span>{minSecWords(q.seconds)}</span>
      </p>
      <button type="button" className={styles.skill} onClick={() => onSkill(q.found)}>
        {q.found.skill.name}
        <Chevron />
      </button>
      {/* the figure leads the words, as it does in the quiz */}
      {sample.figure && <FigureSlot q={sample.figure} calculator={false} />}
      <div className={styles.prompt}>
        <MathText text={sample.prompt} />
      </div>
      {sample.typed && (
        <ol className={styles.choices}>
          <li data-is={q.right ? "right" : "missed"}>
            <i>=</i>
            <span>{sample.typed.given || "No answer"}</span>
            <b>Your answer</b>
          </li>
          {!q.right && (
            <li data-is="right">
              <i>=</i>
              <span>{sample.typed.correct}</span>
              <b>Right answer</b>
            </li>
          )}
        </ol>
      )}
      {drawn.grid ? (
        <FigureChoices
          choices={drawn.choices}
          selected={drawn.choices[q.picked]?.letter ?? null}
          submitted
          correctLetter={drawn.choices[sample.answer]?.letter}
          serializedFunctionLines={sample.figure?.subject === "math"}
          className={styles.figureChoices}
        />
      ) : (
        <ol className={styles.choices} hidden={sample.choices.length === 0}>
          {sample.choices.map((choice, i) => {
            const mine = i === q.picked;
            const answer = i === sample.answer;
            const table = drawn.choices[i]?.choice_table_data;
            return (
              <li key={i} data-is={answer ? "right" : mine ? "missed" : undefined}>
                <i>{"ABCD"[i]}</i>
                <span>
                  {table ? (
                    <QuestionTable
                      data={table}
                      ariaLabel={`Choice ${"ABCD"[i]} table`}
                      className="my-1 w-auto max-w-full shadow-none"
                    />
                  ) : (
                    <MathText text={choice} />
                  )}
                </span>
                {(mine || answer) && <b>{mine ? "Your answer" : "Right answer"}</b>}
              </li>
            );
          })}
        </ol>
      )}
      <div className={styles.why}>
        <h3>Explanation</h3>
        <div>
          <MathText text={sample.why} />
        </div>
      </div>
    </>
  );
}
