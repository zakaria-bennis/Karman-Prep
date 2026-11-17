"use client";

// Questions in Chat (founder, 2026-11-16).
//   QuestionPicker   the student's bookmarked and flagged questions as a grid, each card saying its
//                    skill, its side of the test, where it was met, and how it begins, with a row
//                    of sorts over them. Pressing one chooses it; pressing anywhere outside, or
//                    Escape, leaves without choosing.
//   QuestionView     a question sent in a chat, opened to the whole screen with its choices, so
//                    the people in the chat can work on it together. Anywhere outside, or Escape,
//                    closes it.
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BROUGHT, type Shared } from "./chatStore";
import styles from "./chatQuestions.module.css";
import { tick } from "./sound";

const SORTS = ["All", "Flagged", "Reading and Writing", "Math"] as const;

/** Escape leaves. */
const useEscape = (leave: () => void) =>
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && leave();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

/** Over the whole screen: drawn at the top of the portal's frame, not inside the chat's own pane
 *  (glass keeps what is "fixed" inside itself). */
const Whole = ({ children }: { children: ReactNode }) => {
  const frame = typeof document === "undefined" ? null : document.querySelector(".kp-shell");
  return frame ? createPortal(children, frame) : null;
};

export function Card({ q, full = false }: { q: Shared; full?: boolean }) {
  return (
    <span className={styles.card} data-side={q.section === "Math" ? "math" : "rw"}>
      <small>
        {q.flagged ? "Flagged" : "Bookmarked"}
        <i>{q.section}</i>
      </small>
      <b>{q.skill}</b>
      <span data-full={full || undefined}>{q.prompt}</span>
      <em>{q.from}</em>
    </span>
  );
}

export function QuestionPicker({
  onPick,
  onLeave,
}: {
  onPick: (q: Shared) => void;
  onLeave: () => void;
}) {
  const [sort, setSort] = useState<(typeof SORTS)[number]>("All");
  useEscape(onLeave);
  const shown = BROUGHT.filter(
    (q) => sort === "All" || (sort === "Flagged" ? q.flagged : q.section === sort)
  );
  return (
    <Whole>
      <div className={styles.screen} onClick={onLeave}>
        <div
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label="Your questions"
          onClick={(e) => e.stopPropagation()}
        >
          <header>
            <h2>Your questions</h2>
            <div className={styles.sorts} role="group" aria-label="Show">
              {SORTS.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={sort === name}
                  onClick={() => {
                    setSort(name);
                    tick();
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </header>
          <ul className={styles.grid}>
            {shown.map((q) => (
              <li key={q.skill}>
                <button
                  type="button"
                  onClick={() => onPick(q)}
                  aria-label={`${q.skill}, ${q.from}`}
                >
                  <Card q={q} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Whole>
  );
}

export function QuestionView({ q, onLeave }: { q: Shared; onLeave: () => void }) {
  useEscape(onLeave);
  return (
    <Whole>
      <div className={styles.screen} onClick={onLeave}>
        <div
          className={styles.whole}
          role="dialog"
          aria-modal="true"
          aria-label={q.skill}
          onClick={(e) => e.stopPropagation()}
        >
          <p className={styles.where}>
            <b>{q.skill}</b>
            <span>
              {q.section}, {q.from}
            </span>
          </p>
          <p className={styles.prompt}>{q.prompt}</p>
          <ol className={styles.choices}>
            {q.choices.map((choice, n) => (
              <li key={choice}>
                <b>{"ABCD"[n]}</b>
                {choice}
              </li>
            ))}
          </ol>
          <p className={styles.hint}>
            Work it out together in the chat. The answer is not shown here.
          </p>
        </div>
      </div>
    </Whole>
  );
}
