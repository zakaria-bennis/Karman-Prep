"use client";

// The picture beside "Nine tests in nine weeks. Each one shows us what to fix next": this week's practice
// test with its missed questions marked, and beside it the list of skills that test put on the week's
// work, ticked off one by one. Every few seconds it moves on a week: fewer misses, a shorter list, until
// week nine is clear. Under reduced motion, or when the painting is held still, it stays on one week.
// Sample content; its words come in as props.
import { useEffect, useState } from "react";

/** Questions missed on each week's test, falling to none. */
const MISSED = [6, 5, 4, 4, 3, 2, 2, 1, 0];
/** Which rows of the sheet are the missed ones, in the order they stop being missed. */
const ROWS = [7, 2, 9, 4, 0, 6];
/** The bubble filled in on each of the sheet's ten rows. */
const PICK = [1, 3, 0, 2, 1, 0, 3, 2, 1, 2];

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");

export default function WeekFix({
  sheet,
  week,
  of,
  fix,
  skills,
  clear,
}: {
  sheet: string;
  week: string;
  of: string;
  fix: string;
  skills: string[];
  clear: string;
}) {
  const [at, setAt] = useState(2);
  useEffect(() => {
    const t = setInterval(() => {
      if (!still() && !document.hidden) setAt((n) => (n + 1) % MISSED.length);
    }, 3600);
    return () => clearInterval(t);
  }, []);
  const missed = MISSED[at];
  const wrong = new Set(ROWS.slice(ROWS.length - missed));
  const list = skills.slice(skills.length - missed);
  return (
    <figure className="pg-fix" aria-hidden="true">
      <div className="pg-paper">
        <p>
          <b>{sheet}</b>
          <span className="num">
            {week} {at + 1} {of} {MISSED.length}
          </span>
        </p>
        <ol>
          {PICK.map((pick, i) => (
            <li key={i} data-wrong={wrong.has(i) || undefined}>
              <span className="num">{i + 1}</span>
              {[0, 1, 2, 3].map((b) => (
                <i key={b} data-on={b === pick || undefined} />
              ))}
              <svg viewBox="0 0 20 20">
                <path className="x" d="M5 5l10 10M15 5L5 15" />
                <path className="v" d="M4.5 10.5l3.5 3.5 7.5-8" />
              </svg>
            </li>
          ))}
        </ol>
      </div>
      <div className="pg-todo-card" key={at}>
        <b>{fix}</b>
        {list.length ? (
          <ul>
            {list.map((x, i) => (
              <li key={x} style={{ "--i": i } as React.CSSProperties}>
                <i>
                  <svg viewBox="0 0 20 20">
                    <path d="M5 10.5l3.2 3.2 6.8-7.4" />
                  </svg>
                </i>
                {x}
              </li>
            ))}
          </ul>
        ) : (
          <p>{clear}</p>
        )}
      </div>
      <div className="pg-weeks">
        {MISSED.map((_, i) => (
          <i key={i} data-done={i < at || undefined} data-now={i === at || undefined} />
        ))}
      </div>
    </figure>
  );
}
