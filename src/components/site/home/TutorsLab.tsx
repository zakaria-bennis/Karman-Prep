"use client";

// TEMPORARY (2026-11-10): six ways to show the tutors with six real photos and motion, for the founder to
// pick from. Until the photos arrive, tinted stand-in frames mark where they go; each stand-in is given one
// of the five kinds of tutor in turn (the real pairing is his to give). Never shown in production. The
// choice is data-tut on <html> (0 is today's drawings); styles are in styles/tutors-lab.css. The winner
// replaces the drawings in page.tsx; this file goes.
// Layouts 2, 4, 5 and 6 follow ideas from 21st.dev, rebuilt here in plain code: Card Hand Gallery (34856),
// Team Showcase (10098), Hover Expand Gallery (27010) and the arc Team Section (7612).
import { useEffect, useState, type CSSProperties } from "react";
import "@/app/(site)/styles/tutors-lab.css";

const OPTIONS = [
  ["0", "Today"],
  ["1", "A. Staggered row"],
  ["2", "B. Hand of prints"],
  ["3", "C. One changing line"],
  ["4", "D. Showcase"],
  ["5", "E. Opening strips"],
  ["6", "F. Arc"],
] as const;
const PHOTOS = [0, 1, 2, 3, 4, 5];

function Frame({ n, label }: { n: number; label?: string }) {
  return (
    <span className="tut-frame" data-n={n}>
      <svg viewBox="0 0 100 120" aria-hidden="true">
        <circle cx="50" cy="46" r="19" />
        <path d="M14 120 C 14 86, 32 74, 50 74 C 68 74, 86 86, 86 120 Z" />
      </svg>
      <em>{label ?? `Photo ${n + 1}`}</em>
    </span>
  );
}

export default function TutorsLab({ kinds }: { kinds: [string, string][] }) {
  const [picked, setPicked] = useState("0");
  const [tick, setTick] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("tut") ?? "0";
    document.documentElement.dataset.tut = v;
    setPicked(v);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setTick((n) => n + 1);
    }, 2400);
    return () => clearInterval(timer);
  }, []);
  const pick = (v: string) => {
    const url = new URL(location.href);
    url.searchParams.set("tut", v);
    history.replaceState(null, "", url);
    document.documentElement.dataset.tut = v;
    setPicked(v);
  };
  /* the photo in turn: the one being pointed at, else the next one every couple of seconds */
  const photo = held ?? tick % PHOTOS.length;
  const kindOf = (n: number) => n % kinds.length;
  const kind = kindOf(photo);
  const hold = (n: number) => ({
    onPointerEnter: () => setHeld(n),
    onPointerLeave: () => setHeld(null),
    onClick: () => setHeld(n),
  });
  const list = (
    <ul className="tut-kinds">
      {kinds.map(([name, line], i) => (
        <li key={name} data-on={i === kind || undefined}>
          <b>{name}</b>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
  const word = (
    <p className="tut-word">
      <b key={kind}>{kinds[kind][0]}.</b>
      <span key={`l${kind}`}>{kinds[kind][1]}</span>
    </p>
  );

  return (
    <>
      {/* A. Staggered row: six arches at different heights, bobbing a little; the kinds listed below */}
      <div className="tut tut-a rv">
        <div className="tut-row">
          {PHOTOS.map((n) => (
            <Frame key={n} n={n} />
          ))}
        </div>
        {list}
      </div>

      {/* B. Hand of prints: six prints fanned like a hand of cards; one at a time is pulled up and named */}
      <div className="tut tut-b rv">
        <div className="tut-hand">
          {PHOTOS.map((n) => (
            <button
              key={n}
              type="button"
              className="tut-print"
              data-on={n === photo || undefined}
              style={{ "--i": n - 2.5 } as CSSProperties}
              {...hold(n)}
            >
              <Frame n={n} />
            </button>
          ))}
        </div>
        {word}
      </div>

      {/* C. One changing line: six small round photos, and one big line that changes */}
      <div className="tut tut-c rv">
        <div className="tut-faces">
          {PHOTOS.map((n) => (
            <Frame key={n} n={n} />
          ))}
        </div>
        {word}
      </div>

      {/* D. Showcase: photos in three uneven columns, grey until their turn; the kinds listed beside */}
      <div className="tut tut-d rv">
        <div className="tut-grid">
          {PHOTOS.map((n) => (
            <button
              key={n}
              type="button"
              className="tut-cell"
              data-on={kindOf(n) === kind || undefined}
              {...hold(n)}
            >
              <Frame n={n} />
            </button>
          ))}
        </div>
        {list}
      </div>

      {/* E. Opening strips: six tall strips; the one in turn opens wide to show the whole photo */}
      <div className="tut tut-e rv">
        <div className="tut-strips">
          {PHOTOS.map((n) => (
            <button
              key={n}
              type="button"
              className="tut-strip"
              data-on={n === photo || undefined}
              {...hold(n)}
            >
              <Frame n={n} />
              <span className="tut-strip-label">
                <b>{kinds[kindOf(n)][0]}</b>
                <i>{kinds[kindOf(n)][1]}</i>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* F. Arc: six round photos along an arc, like the sun's path; the changing line under it */}
      <div className="tut tut-f rv">
        <div className="tut-arc">
          {PHOTOS.map((n) => {
            const a = Math.PI * (1 - (n + 0.5) / PHOTOS.length);
            return (
              <button
                key={n}
                type="button"
                className="tut-dot"
                data-on={n === photo || undefined}
                style={
                  {
                    left: `${(50 + 44 * Math.cos(a)).toFixed(2)}%`,
                    top: `${(100 - 86 * Math.sin(a)).toFixed(2)}%`,
                    "--k": n,
                  } as CSSProperties
                }
                {...hold(n)}
              >
                <Frame n={n} />
              </button>
            );
          })}
          {word}
        </div>
      </div>

      <aside className="lab" aria-label="Options to try">
        <b>Tutors section: tap an option to see it on the page</b>
        <div>
          {OPTIONS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              data-on={picked === v || undefined}
              onClick={() => pick(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
