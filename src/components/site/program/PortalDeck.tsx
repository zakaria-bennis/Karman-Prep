"use client";

// A carousel of cards that turns by itself: what the parent of one student sees in the parent portal, one
// view to a card (homework, skills, predicted score, practice time, the tutor's note). The card in front has
// the next and the last one peeking out beside it. It can be slid with a finger or dragged with a mouse, and
// turned with the arrow keys; pointing at it holds it (founder, 2026-11-13: no row of dashes to press).
// Under reduced motion, or when the painting is held still, it only turns when slid. All of it comes in as
// props.
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
  /** The portal's own chrome: its name, the student's name and initials. */
  brand: string;
  student: string;
  initials: string;
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
  // sliding: the front card follows the finger or the mouse, and past a short pull the carousel turns
  const stack = useRef<HTMLDivElement>(null);
  const pull = useRef<{ x: number; id: number } | null>(null);
  const drag = (dx: number) => stack.current?.style.setProperty("--dx", `${dx}px`);
  const down = (e: React.PointerEvent) => {
    pull.current = { x: e.clientX, id: e.pointerId };
    held.current = true;
  };
  const move = (e: React.PointerEvent) => {
    if (!pull.current) return;
    const dx = e.clientX - pull.current.x;
    if (Math.abs(dx) > 6) stack.current?.setPointerCapture(pull.current.id);
    stack.current?.toggleAttribute("data-pull", true);
    drag(dx);
  };
  const up = (e: React.PointerEvent) => {
    if (!pull.current) return;
    const dx = e.clientX - pull.current.x;
    pull.current = null;
    held.current = e.pointerType === "mouse";
    stack.current?.removeAttribute("data-pull");
    drag(0);
    if (Math.abs(dx) > 44) setAt((i) => (i + (dx < 0 ? 1 : n - 1)) % n);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setAt((i) => (i + 1) % n);
    if (e.key === "ArrowLeft") setAt((i) => (i + n - 1) % n);
  };
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
      <div
        className="pd-stack"
        ref={stack}
        role="group"
        aria-roledescription="carousel"
        aria-label={w.brand}
        tabIndex={0}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {cards.map((card, i) => {
          const place = (i - at + n) % n;
          return (
            <article
              key={i}
              data-place={
                place === 0 ? 0 : place === 1 ? "next" : place === n - 1 ? "last" : "back"
              }
              aria-hidden={place !== 0}
            >
              <header>
                <b>{w.brand}</b>
                <nav>
                  {w.titles.map((t, j) => (
                    <span key={t} data-on={j === i || undefined}>
                      {t}
                    </span>
                  ))}
                </nav>
                <em>
                  <i>{w.initials}</i>
                  {w.student}
                </em>
              </header>
              {card}
            </article>
          );
        })}
      </div>
      <p className="pd-cap" key={at}>
        {w.captions[at]}
      </p>
    </div>
  );
}
