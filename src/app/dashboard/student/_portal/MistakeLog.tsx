"use client";

// The Mistake Log (founder, 2026-11-15 and 2026-11-16). It began as History, a page inside Progress;
// he renamed it and gave it its own place in the menu.
//   Sessions    every sitting, newest first, by day: skill sets, the Daily 10, full-length exams,
//               challenge questions, time trials and endless mode.
//   Missed      every missed question, newest first.
//   Bookmarks   every question the student kept. A Cohort or Private student can also flag a question
//               for their tutor; a flagged question is a bookmark that carries a small flag.
// Three menus narrow all three: activities, domains, skills, each taking several choices
// (MistakeLogSift.tsx). Never by difficulty.
// Nothing is open until it is picked (founder, 2026-11-16: "we don't just have questions populating
// for no reason"). The way through it:
//   1. The log alone, across the whole page.
//   2. Pick a sitting: the log draws in to the left and a pane comes in from the right with an
//      overview of that sitting. It lists no questions.
//   3. From the overview, go on to its questions (all, or the missed), and from those to one
//      question: the student's answer, the right answer and the explanation. No retry.
// In Missed and Bookmarks a row is a question, so picking one opens that question.
// With room, both panes scroll inside their own glass. On a phone each step is a page of its own and
// the page's own way back steps out of it (told through `onTrail`); this page may scroll there.
// Escape steps back one level everywhere. Everything here is a stand-in (mistakeLogData.ts).
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import lib from "./library.module.css";
import {
  MODES,
  NO_SIFT,
  fits,
  fromReal,
  sifted,
  sittingsOf,
  type Asked,
  type Sift,
} from "./mistakeLogData";
import { saveMark } from "./saveMark";
import styles from "./mistakeLog.module.css";
import { Sifts } from "./MistakeLogSift";
import {
  Chevron,
  QuestionRow,
  QuestionView,
  SessionOverview,
  SessionQuestions,
  dayName,
  took,
  within,
  type Marked,
  type Ways,
  type Within,
} from "./MistakeLogViews";
import type { Found } from "./progressBreakdowns";
import { activity, type Student } from "./progressData";
import { minSecWords, timeOfDay } from "./progressStats";
import { tick } from "./sound";
import { useSkills } from "./portalData";
import { useStill } from "@/lib/painting/useStill";

const LENSES = ["Sessions", "Missed", "Bookmarks"] as const;
type Lens = (typeof LENSES)[number];
/** How many rows are shown before "Show earlier" is pressed, and how many each press adds. */
const STEP = 40;

/** What the page's title and its way back should say while something in the log is open. */
export type Trail = { name: string; back: string; go: () => void };

/** Rows in day order, cut into one group for each day. */
function byDay<T extends { day: number }>(rows: T[]): { day: number; rows: T[] }[] {
  const groups: { day: number; rows: T[] }[] = [];
  rows.forEach((row) => {
    const last = groups[groups.length - 1];
    if (last?.day === row.day) last.rows.push(row);
    else groups.push({ day: row.day, rows: [row] });
  });
  return groups;
}

export default function MistakeLog({
  rail,
  student,
  flags,
  onSkill,
  onTrail,
}: {
  rail: boolean;
  student: Student;
  /** Whether this student can flag questions for a tutor (Cohort and Private). */
  flags: boolean;
  onSkill: (found: Found) => void;
  onTrail: (trail: Trail | null) => void;
}) {
  const still = useStill();
  const skills = useSkills();
  const sessions = useMemo(
    () =>
      student.sittings
        ? fromReal(student.sittings, skills)
        : sittingsOf(student, activity(student)),
    [student, skills]
  );
  const [lens, setLens] = useState<Lens>("Sessions");
  const [sift, setSift] = useState<Sift>(NO_SIFT);
  const [openSession, setOpenSession] = useState<string | null>(null);
  /** Whether the open sitting shows its questions, not its overview. */
  const [listing, setListing] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [shown, setShown] = useState<Within>("All");
  const [many, setMany] = useState(STEP);
  // bookmarks and flags changed on this page; a real question's are saved as they change
  const [marks, setMarks] = useState<Record<string, Marked>>({});

  const sittings = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (!sift.modes.length || sift.modes.includes(s.mode)) && s.asked.some((q) => fits(q, sift))
      ),
    [sessions, sift]
  );
  const questions = useMemo(
    () => sessions.flatMap((s) => s.asked).filter((q) => fits(q, sift)),
    [sessions, sift]
  );
  const listed = useMemo(() => {
    const markOf = (q: Asked) => marks[q.id] ?? q;
    return lens === "Missed"
      ? questions.filter((q) => !q.right)
      : lens === "Bookmarks"
        ? questions.filter((q) => markOf(q).bookmarked)
        : [];
  }, [lens, questions, marks]);
  const markOf = (q: Asked): Marked => marks[q.id] ?? q;

  // nothing is open until it is pressed
  const session = lens === "Sessions" ? sittings.find((s) => s.id === openSession) : undefined;
  // a bookmark taken off the open question drops it from the list, but it stays open
  const question =
    lens === "Sessions"
      ? listing
        ? session?.asked.find((q) => q.id === openQuestion)
        : undefined
      : questions.find((q) => q.id === openQuestion);
  // the list a question was opened from: the questions before and after it are its neighbors there
  const around = lens === "Sessions" ? (session ? within(session, shown) : []) : listed;
  const place = question ? around.findIndex((q) => q.id === question.id) : -1;
  const step = (by: number) =>
    place >= 0 && around[place + by]
      ? () => {
          setOpenQuestion(around[place + by].id);
          tick();
        }
      : undefined;

  // one step back out of whatever is open, and what the page should be called meanwhile
  const back = useMemo<Trail | null>(() => {
    if (question)
      return {
        name: `Question ${question.number}`,
        back: lens === "Sessions" ? "Questions" : "Mistake Log",
        go: () => setOpenQuestion(null),
      };
    if (session && listing)
      return { name: "Questions", back: session.name, go: () => setListing(false) };
    if (session) return { name: session.name, back: "Mistake Log", go: () => setOpenSession(null) };
    return null;
  }, [question, session, listing, lens]);
  const open = back !== null;
  useEffect(() => {
    onTrail(rail ? null : back);
    return () => onTrail(null);
  }, [back, rail, onTrail]);
  useEffect(() => {
    if (!back) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && back.go();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [back]);

  const close = () => {
    setOpenSession(null);
    setListing(false);
    setOpenQuestion(null);
  };
  const fresh = () => {
    close();
    setShown("All");
    setMany(STEP);
  };
  // a phone goes to the top of the page it opens, and comes back to where the list was left
  const left = useRef(0);
  const deep = !rail && open;
  const pick = (go: () => void) => {
    if (!deep) left.current = window.scrollY;
    go();
    tick();
    if (!rail) window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    if (!rail && !deep) window.scrollTo({ top: left.current });
  }, [rail, deep]);

  const empty = lens === "Sessions" ? sittings.length === 0 : listed.length === 0;
  const rows = lens === "Sessions" ? sittings : listed;
  // with room, the pane beside the log has its own way back a level and its own way to close
  const ways: Ways = rail
    ? {
        back:
          back && (listing || (question && lens === "Sessions"))
            ? { label: back.back, go: back.go }
            : undefined,
        close,
      }
    : {};

  return (
    <div className={`${lib.library} ${styles.mistakes}`} data-open={(rail && open) || undefined}>
      {!deep && (
        <section className={`${lib.glass} ${styles.log}`} aria-label="Log">
          <div className={styles.top}>
            <div className={`${lib.filter} ${styles.lenses}`} role="group" aria-label="Shown">
              {LENSES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={lens === name}
                  onClick={() => {
                    setLens(name);
                    fresh();
                    tick();
                  }}
                >
                  {lens === name && (
                    <motion.span
                      layoutId="mistakes-lens"
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
            <Sifts
              sift={sift}
              onSift={(next) => {
                setSift(next);
                fresh();
              }}
            />
          </div>
          <div className={styles.scroll}>
            {empty ? (
              <div className={styles.none}>
                <h2>
                  {sifted(sift)
                    ? "Nothing here"
                    : lens === "Bookmarks"
                      ? "No bookmarks yet"
                      : lens === "Missed"
                        ? "No mistakes yet"
                        : "Nothing yet"}
                </h2>
                {sifted(sift) ? (
                  <button
                    type="button"
                    className={styles.more}
                    onClick={() => {
                      setSift(NO_SIFT);
                      fresh();
                      tick();
                    }}
                  >
                    Show everything
                  </button>
                ) : (
                  lens === "Bookmarks" && <p>Bookmark a question to keep it here.</p>
                )}
              </div>
            ) : (
              // the names of the columns that show when the log has the page to itself
              <div
                className={styles.heads}
                data-q={lens !== "Sessions" || undefined}
                aria-hidden="true"
              >
                <span />
                {lens === "Sessions" && <span>Correct</span>}
                <span>Time</span>
                {lens === "Sessions" && <span>Pace</span>}
                <span />
              </div>
            )}
            {lens === "Sessions"
              ? byDay(sittings.slice(0, many)).map((group) => (
                  <div key={group.day} className={styles.day}>
                    <h3>{dayName(student, group.day)}</h3>
                    <ul className={styles.rows}>
                      {group.rows.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className={styles.row}
                            aria-current={(rail && session?.id === s.id) || undefined}
                            onClick={() =>
                              pick(() => {
                                setOpenSession(s.id);
                                setListing(false);
                                setOpenQuestion(null);
                                setShown("All");
                              })
                            }
                          >
                            <span className={styles.what}>
                              <b>{s.name}</b>
                              {/* when it was begun, and what kind of work it was */}
                              <small>
                                {timeOfDay(s.at)}
                                {s.mode === "skill"
                                  ? `, ${MODES.skill}`
                                  : (s.mode === "trial" || s.mode === "endless") &&
                                    `, ${s.asked[0].found.section}`}
                              </small>
                            </span>
                            <span className={styles.got}>
                              <b>{s.right}</b> of {s.asked.length}
                            </span>
                            <span className={styles.wide}>{took(s.seconds)}</span>
                            <span className={styles.wide}>
                              {s.asked.length > 1 && minSecWords(s.seconds / s.asked.length)}
                            </span>
                            <Chevron />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              : byDay(listed.slice(0, many)).map((group) => (
                  <div key={group.day} className={styles.day}>
                    <h3>{dayName(student, group.day)}</h3>
                    <ul className={styles.rows}>
                      {group.rows.map((q) => (
                        <QuestionRow
                          key={q.id}
                          q={q}
                          name={q.found.skill.name}
                          small={q.mode === "skill" ? MODES.skill : q.sessionName}
                          marked={markOf(q)}
                          flags={flags}
                          current={rail && question?.id === q.id}
                          onOpen={() => pick(() => setOpenQuestion(q.id))}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
            {rows.length > many && (
              <button
                type="button"
                className={styles.more}
                onClick={() => {
                  setMany(many + STEP);
                  tick();
                }}
              >
                Show earlier
              </button>
            )}
          </div>
        </section>
      )}

      {/* what was picked comes in from the right; the log draws in to the left to make room */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            key="open"
            className={`${lib.glass} ${styles.reading}`}
            aria-label={question ? `Question ${question.number}` : (session?.name ?? "Open")}
            initial={still || !rail ? false : { x: 72, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={
              still || !rail ? undefined : { x: 72, opacity: 0, transition: { duration: 0.16 } }
            }
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            {/* the glass stays; only what is on it turns */}
            <div
              key={question?.id ?? `${session?.id} ${listing ? "questions" : "overview"}`}
              className={styles.sheet}
            >
              {question ? (
                <QuestionView
                  student={student}
                  q={question}
                  marked={markOf(question)}
                  flags={flags}
                  named={!rail}
                  ways={ways}
                  onMark={(next) => {
                    saveMark(question, marks[question.id] ?? question, next);
                    setMarks({ ...marks, [question.id]: next });
                  }}
                  onStep={{ before: step(-1), after: step(1) }}
                  onSkill={onSkill}
                />
              ) : session && listing ? (
                <SessionQuestions
                  session={session}
                  shown={shown}
                  onShown={setShown}
                  markOf={markOf}
                  flags={flags}
                  ways={ways}
                  onOpen={(q) => pick(() => setOpenQuestion(q.id))}
                />
              ) : (
                session && (
                  <SessionOverview
                    student={student}
                    session={session}
                    named={!rail}
                    ways={ways}
                    onQuestions={(next) => {
                      setShown(next);
                      setListing(true);
                      if (!rail) window.scrollTo({ top: 0 });
                    }}
                    onSkill={onSkill}
                  />
                )
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
