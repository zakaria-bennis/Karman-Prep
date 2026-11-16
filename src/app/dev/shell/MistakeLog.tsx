"use client";

// The Mistake Log (founder, 2026-11-15 and 2026-11-16). It began as History, a page inside Progress;
// he renamed it and gave it its own place in the menu, right under Progress.
//   Missed      every missed question, newest first. This is what the page is named for, so it
//               opens here.
//   Sessions    every sitting, newest first, by day: skill sets, the Daily 10, full-length exams,
//               challenge questions, time trials and endless mode. Opening one shows how it went and
//               its questions, which can be narrowed to correct or missed.
//   Bookmarks   every question the student kept. A Cohort or Private student can also flag a question
//               for their tutor; a flagged question is a bookmark that carries a small flag.
// Four menus narrow all three: kind of work, section, domain, skill. Never by difficulty.
// Opening a question shows the student's answer, the right answer and the explanation. No retry.
// With room, the log is at the left and what is open is at the right, each scrolling inside its own
// piece of glass. On a phone each is a page of its own, and the page's own way back steps out of it
// (the page is told through `onTrail`). On a phone this page may scroll.
// Everything here is a stand-in (mistakeLogData.ts).
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  QuestionRow,
  QuestionView,
  SessionView,
  Sifts,
  dayName,
  within,
  type Marked,
  type Within,
} from "./MistakeLogViews";
import lib from "./library.module.css";
import type { Found } from "./progressBreakdowns";
import { activity, type Student } from "./progressData";
import {
  MODES,
  NO_SIFT,
  fits,
  sifted,
  sittingsOf,
  type Asked,
  type Session,
  type Sift,
} from "./mistakeLogData";
import styles from "./mistakeLog.module.css";
import { tick } from "./sound";

const LENSES = ["Missed", "Sessions", "Bookmarks"] as const;
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
  const still = useReducedMotion() ?? false;
  const sessions = useMemo(() => sittingsOf(student, activity(student)), [student]);
  const [lens, setLens] = useState<Lens>("Missed");
  const [sift, setSift] = useState<Sift>(NO_SIFT);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [shown, setShown] = useState<Within>("All");
  const [many, setMany] = useState(STEP);
  // bookmarks and flags changed on this page (nothing is saved yet)
  const [marks, setMarks] = useState<Record<string, Marked>>({});

  const sittings = useMemo(
    () =>
      sessions.filter(
        (s) => (!sift.mode || s.mode === sift.mode) && s.asked.some((q) => fits(q, sift))
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

  // with room, the first row is open from the start, so the right side is never empty; on a phone
  // nothing is open until it is pressed
  const session: Session | undefined =
    lens === "Sessions"
      ? (sittings.find((s) => s.id === openSession) ?? (rail ? sittings[0] : undefined))
      : undefined;
  const question: Asked | undefined =
    lens === "Sessions"
      ? session?.asked.find((q) => q.id === openQuestion)
      : (listed.find((q) => q.id === openQuestion) ?? (rail ? listed[0] : undefined));
  // the list a question was opened from: the questions before and after it are its neighbors there
  const around = lens === "Sessions" ? (session ? within(session.asked, shown) : []) : listed;
  const place = question ? around.findIndex((q) => q.id === question.id) : -1;
  const step = (by: number) =>
    around[place + by]
      ? () => {
          setOpenQuestion(around[place + by].id);
          tick();
        }
      : undefined;

  // what is open on top of the list, and the way out of it: on a phone that is the page's own way
  // back; with room it is only a question opened from a sitting, which has its own way back
  const inner = useMemo<Trail | null>(() => {
    if (question && (lens === "Sessions" || !rail))
      return {
        name: `Question ${question.number}`,
        back: lens === "Sessions" ? (session?.name ?? "Mistake Log") : "Mistake Log",
        go: () => setOpenQuestion(null),
      };
    if (session && !rail)
      return { name: session.name, back: "Mistake Log", go: () => setOpenSession(null) };
    return null;
  }, [question, session, lens, rail]);
  useEffect(() => {
    onTrail(rail ? null : inner);
    return () => onTrail(null);
  }, [inner, rail, onTrail]);
  // Escape steps out of what is open here
  useEffect(() => {
    if (!inner) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      inner.go();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [inner]);

  const fresh = () => {
    setOpenSession(null);
    setOpenQuestion(null);
    setShown("All");
    setMany(STEP);
  };
  const open = (go: () => void) => {
    go();
    tick();
    if (!rail) window.scrollTo({ top: 0 });
  };
  const empty = lens === "Sessions" ? sittings.length === 0 : listed.length === 0;
  const rows = lens === "Sessions" ? sittings : listed;
  const deep = rail ? 0 : inner ? 1 : 0;

  return (
    <div className={`${lib.library} ${styles.mistakes}`} data-alone={(rail && empty) || undefined}>
      {deep === 0 && (
        <section className={`${lib.glass} ${styles.log}`} aria-label="Log">
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
          <div className={styles.scroll}>
            {empty && (
              <div className={styles.none}>
                <h2>
                  {sifted(sift)
                    ? "Nothing here"
                    : lens === "Bookmarks"
                      ? "No bookmarks yet"
                      : lens === "Missed"
                        ? "Nothing missed"
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
                  lens === "Bookmarks" && (
                    <p>Bookmark a question while you practice and it is kept here.</p>
                  )
                )}
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
                              open(() => {
                                setOpenSession(s.id);
                                setOpenQuestion(null);
                                setShown("All");
                              })
                            }
                          >
                            <span className={styles.what}>
                              <b>{s.name}</b>
                              {s.mode === "skill" ? (
                                <small>{MODES.skill}</small>
                              ) : (
                                (s.mode === "trial" || s.mode === "endless") && (
                                  <small>{s.asked[0].found.section}</small>
                                )
                              )}
                            </span>
                            <span className={styles.got}>
                              <b>{s.right}</b> of {s.asked.length}
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
                          onOpen={() => open(() => setOpenQuestion(q.id))}
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

      {(rail ? !empty : deep === 1) && (
        <section
          className={`${lib.glass} ${styles.reading}`}
          aria-label={question ? `Question ${question.number}` : (session?.name ?? "Open")}
        >
          {/* the glass stays; only what is on it turns */}
          <div key={question?.id ?? session?.id} className={styles.sheet}>
            {question ? (
              <QuestionView
                student={student}
                q={question}
                marked={markOf(question)}
                flags={flags}
                named={!rail}
                back={rail && inner ? { label: inner.back, go: inner.go } : undefined}
                onMark={(next) => setMarks({ ...marks, [question.id]: next })}
                onStep={{ before: step(-1), after: step(1) }}
                onSkill={onSkill}
              />
            ) : (
              session && (
                <SessionView
                  student={student}
                  session={session}
                  shown={shown}
                  onShown={setShown}
                  markOf={markOf}
                  flags={flags}
                  named={!rail}
                  onOpen={(q) => open(() => setOpenQuestion(q.id))}
                />
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
