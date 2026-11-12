"use client";

// A drawing of the parent portal with four tabs (score, skills, homework, the tutor's note). The marker
// slides between tabs and each view draws itself when shown. Sample content, marked as an example; all of
// it comes in as props.
import { useState } from "react";

export interface PortalWords {
  tabs: string[];
  sample: string;
  captions: string[];
  weeks: string[];
  skills: string[];
  levels: string[];
  homework: string[];
  note: string;
  noteFrom: string;
}

/* how far along each sample skill is, as a share of the bar, and which level word it gets */
const SKILL = [
  [1, 0],
  [0.45, 2],
  [0.72, 1],
  [1, 0],
  [0.6, 1],
] as const;

export default function ProgramPortal({ w }: { w: PortalWords }) {
  const [at, setAt] = useState(0);
  return (
    <div className="pg-portal">
      <div className="pg-bar">
        <span aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <em>{w.sample}</em>
      </div>
      <div
        className="pg-tabs"
        role="tablist"
        style={{ "--n": w.tabs.length, "--at": at } as React.CSSProperties}
      >
        {w.tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`pg-tab-${i}`}
            aria-selected={i === at}
            aria-controls="pg-view"
            onClick={() => setAt(i)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        className="pg-view"
        id="pg-view"
        role="tabpanel"
        aria-labelledby={`pg-tab-${at}`}
        key={at}
      >
        {at === 0 ? (
          <div className="pg-chart" aria-hidden="true">
            <svg viewBox="0 0 400 170" preserveAspectRatio="none">
              <path className="g" d="M0 42h400M0 85h400M0 128h400" />
              <path
                className="a"
                d="M8 150C60 146 80 128 130 122s70-30 120-40 90-38 142-62V170H8z"
              />
              <path className="l" d="M8 150C60 146 80 128 130 122s70-30 120-40 90-38 142-62" />
            </svg>
            <span className="dot" />
            <p>
              {w.weeks.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </p>
          </div>
        ) : at === 1 ? (
          <ul className="pg-skills" aria-hidden="true">
            {w.skills.map((x, i) => (
              <li
                key={x}
                style={{ "--v": SKILL[i][0], "--i": i } as React.CSSProperties}
                data-l={SKILL[i][1]}
              >
                <b>{x}</b>
                <span>
                  <i />
                </span>
                <em>{w.levels[SKILL[i][1]]}</em>
              </li>
            ))}
          </ul>
        ) : at === 2 ? (
          <ul className="pg-todo" aria-hidden="true">
            {w.homework.map((x, i) => (
              <li
                key={x}
                style={{ "--i": i } as React.CSSProperties}
                data-open={i === 3 || undefined}
              >
                <i>
                  <svg viewBox="0 0 20 20">
                    <path d="M5.5 10.5l3 3 6-7" />
                  </svg>
                </i>
                {x}
              </li>
            ))}
          </ul>
        ) : (
          <blockquote className="pg-letter" aria-hidden="true">
            <p>{w.note}</p>
            <footer>{w.noteFrom}</footer>
          </blockquote>
        )}
        <p className="pg-cap">{w.captions[at]}</p>
      </div>
    </div>
  );
}
