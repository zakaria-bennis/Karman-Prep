"use client";

// A deck of cards that turns by itself: what the parent of one student sees in the parent portal, one view
// to a card (homework, skills, predicted score, practice time, the tutor's note). The card in front slides
// away and the next comes up; pointing at the deck holds it, and the dots pick a card. Under reduced motion,
// or when the painting is held still, it only turns when a dot is pressed. All of it comes in as props.
import { useEffect, useRef, useState } from "react";

export interface DeckWords {
  titles: string[];
  captions: string[];
  /** [task, status] */
  homework: [string, string][];
  /** [skill, level word] */
  skills: [string, string][];
  score: {
    startLabel: string;
    start: number;
    nowLabel: string;
    now: number;
    goalLabel: string;
    goal: number;
  };
  days: string[];
  minutes: number[];
  timeTotal: string;
  note: string;
  noteFrom: string;
}

/* how full each sample skill's bar is, beside its level word */
const FILL = [1, 0.82, 0.64, 0.48, 0.9];

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");

export default function PortalDeck({ w }: { w: DeckWords }) {
  const n = w.titles.length;
  const [at, setAt] = useState(0);
  const held = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      if (!held.current && !still() && !document.hidden) setAt((i) => (i + 1) % n);
    }, 4200);
    return () => clearInterval(t);
  }, [n]);
  const { score } = w;
  const along = (score.now - score.start) / (score.goal - score.start);
  const most = Math.max(...w.minutes);
  const cards = [
    <ul key="hw" className="pd-list">
      {w.homework.map(([task, status], i) => (
        <li key={task} data-open={i === w.homework.length - 1 || undefined}>
          <i>
            <svg viewBox="0 0 20 20">
              <path d="M5 10.5l3.2 3.2 6.8-7.4" />
            </svg>
          </i>
          <b>{task}</b>
          <span>{status}</span>
        </li>
      ))}
    </ul>,
    <ul key="sk" className="pd-skills">
      {w.skills.map(([skill, level], i) => (
        <li key={skill} style={{ "--v": FILL[i], "--i": i } as React.CSSProperties}>
          <b>{skill}</b>
          <span>
            <i />
          </span>
          <em>{level}</em>
        </li>
      ))}
    </ul>,
    <div key="sc" className="pd-score">
      <b className="num">{score.now}</b>
      <span>{score.nowLabel}</span>
      <div className="pd-track" style={{ "--v": along } as React.CSSProperties}>
        <i />
        <u />
      </div>
      <p>
        <span>
          {score.startLabel} <b className="num">{score.start}</b>
        </span>
        <span>
          {score.goalLabel} <b className="num">{score.goal}</b>
        </span>
      </p>
    </div>,
    <div key="tm" className="pd-time">
      <b className="num">{w.timeTotal}</b>
      <ol>
        {w.minutes.map((m, i) => (
          <li key={i} style={{ "--v": m / most, "--i": i } as React.CSSProperties}>
            <i />
            <span>{w.days[i]}</span>
          </li>
        ))}
      </ol>
    </div>,
    <blockquote key="nt" className="pd-note">
      <p>{w.note}</p>
      <footer>{w.noteFrom}</footer>
    </blockquote>,
  ];
  return (
    <div
      className="pd"
      onPointerEnter={() => (held.current = true)}
      onPointerLeave={() => (held.current = false)}
    >
      <div className="pd-stack">
        {cards.map((card, i) => {
          const place = (i - at + n) % n;
          return (
            <article key={i} data-place={place > 2 ? "back" : place} aria-hidden={place !== 0}>
              <h4>{w.titles[i]}</h4>
              {card}
            </article>
          );
        })}
      </div>
      <p className="pd-cap" key={at}>
        {w.captions[at]}
      </p>
      <div className="pd-dots">
        {w.titles.map((t, i) => (
          <button
            key={t}
            type="button"
            aria-label={t}
            aria-pressed={i === at}
            onClick={() => setAt(i)}
          />
        ))}
      </div>
    </div>
  );
}
