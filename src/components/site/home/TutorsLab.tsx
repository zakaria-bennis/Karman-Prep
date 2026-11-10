"use client";

// TEMPORARY (2026-11-10): ten ways to show the tutors with six photos and motion, for the founder to pick
// from. The photos are STAND-INS: open-licence stock portraits of strangers from Unsplash, kept out of git
// (public/site/tutors/standin/, see .gitignore) so they can never be deployed. His six real photos replace
// them. Each stand-in is paired with one of the five kinds of tutor in turn; the real pairing is his to
// give. Never shown in production. The choice is data-tut on <html> (0 is today's drawings); styles are in
// styles/tutors-lab.css. The winner replaces the drawings in page.tsx; this file goes.
// Several layouts follow ideas from 21st.dev, rebuilt here in plain code: Card Hand Gallery (34856), Team
// Showcase (10098), Hover Expand Gallery (27010), the arc Team Section (7612), Team Section with Duotone
// Portraits (38219) and the blur-the-rest Cards (7840).
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
  ["7", "G. Drifting columns"],
  ["8", "H. Spotlight"],
  ["9", "I. Prints on a desk"],
  ["10", "J. Focus grid"],
] as const;
const PHOTOS = [0, 1, 2, 3, 4, 5];
/** Where each print lies on the desk: left %, top %, turn in degrees. */
const DESK = [
  [0, 4, -7],
  [16, 46, 5],
  [34, 0, 3],
  [51, 44, -4],
  [67, 2, 6],
  [83, 42, -6],
];
/** The order of the photos in each drifting column. */
const COLUMNS = [
  [0, 3, 1, 4],
  [2, 5, 0, 3],
  [4, 1, 5, 2],
];
const rise = (r: number) => ({ "data-rise": "", style: { "--r": r } as CSSProperties });

function Photo({ n }: { n: number }) {
  return (
    <span className="tut-photo">
      {/* eslint-disable-next-line @next/next/no-img-element -- local stand-in photos, development only */}
      <img
        src={`/site/tutors/standin/p${n + 1}.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
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
    }, 2600);
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
      {/* A. Staggered row: six arches at different heights, each named; the one in turn steps up */}
      <div className="tut tut-a rv">
        <div className="tut-row">
          {PHOTOS.map((n) => (
            <button
              key={n}
              type="button"
              data-on={n === photo || undefined}
              {...rise(n)}
              {...hold(n)}
            >
              <Photo n={n} />
              <b>{kinds[kindOf(n)][0]}</b>
            </button>
          ))}
        </div>
        <p className="tut-line" key={kind}>
          {kinds[kind][1]}
        </p>
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
              <Photo n={n} />
            </button>
          ))}
        </div>
        {word}
      </div>

      {/* C. One changing line: six small round photos, and one big line that changes */}
      <div className="tut tut-c rv">
        <div className="tut-faces">
          {PHOTOS.map((n) => (
            <button
              key={n}
              type="button"
              data-on={n === photo || undefined}
              {...rise(n)}
              {...hold(n)}
            >
              <Photo n={n} />
            </button>
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
              {...rise(n)}
              {...hold(n)}
            >
              <Photo n={n} />
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
              {...rise(n)}
              {...hold(n)}
            >
              <Photo n={n} />
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
                <Photo n={n} />
              </button>
            );
          })}
          {word}
        </div>
      </div>

      {/* G. Drifting columns: three columns of portraits in one ink tone, drifting opposite ways */}
      <div className="tut tut-g rv">
        <div className="tut-cols">
          {COLUMNS.map((col, c) => (
            <div key={c} className="tut-col" data-down={c === 1 || undefined}>
              {[...col, ...col].map((n, i) => (
                <span key={i} className="tut-tone" data-on={n === photo || undefined}>
                  <Photo n={n} />
                </span>
              ))}
            </div>
          ))}
        </div>
        {list}
      </div>

      {/* H. Spotlight: one large portrait at a time with its kind in big type; six small ones to choose from */}
      <div className="tut tut-h rv">
        <div className="tut-stage" key={photo}>
          <Photo n={photo} />
        </div>
        <div className="tut-side">
          {word}
          <div className="tut-thumbs">
            {PHOTOS.map((n) => (
              <button key={n} type="button" data-on={n === photo || undefined} {...hold(n)}>
                <Photo n={n} />
                {n === photo ? <i key={tick} /> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* I. Prints on a desk: six prints lying at angles, each with its kind handwritten underneath */}
      <div className="tut tut-i rv">
        <div className="tut-desk">
          {PHOTOS.map((n) => (
            <button
              key={n}
              type="button"
              className="tut-snap"
              data-on={n === photo || undefined}
              style={
                {
                  "--x": `${DESK[n][0]}%`,
                  "--y": `${DESK[n][1]}%`,
                  "--t": `${DESK[n][2]}deg`,
                  "--r": n,
                } as CSSProperties
              }
              data-rise=""
              {...hold(n)}
            >
              <Photo n={n} />
              <em>{kinds[kindOf(n)][0]}</em>
            </button>
          ))}
        </div>
        <p className="tut-line" key={kind}>
          {kinds[kind][1]}
        </p>
      </div>

      {/* J. Focus grid: six cards; the one in turn is sharp and lifted, the rest fall back out of focus */}
      <div className="tut tut-j rv">
        <div className="tut-focus">
          {PHOTOS.map((n) => (
            <button
              key={n}
              type="button"
              data-on={n === photo || undefined}
              {...rise(n)}
              {...hold(n)}
            >
              <Photo n={n} />
              <span>
                <b>{kinds[kindOf(n)][0]}</b>
                <i>{kinds[kindOf(n)][1]}</i>
              </span>
            </button>
          ))}
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
