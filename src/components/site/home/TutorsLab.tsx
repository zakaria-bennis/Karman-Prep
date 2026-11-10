"use client";

// TEMPORARY (2026-11-10): three ways to show the tutors with real photos and motion, for the founder to pick
// from. He has "a couple" of photos, fewer than the five kinds of tutor, so each layout keeps the photos
// and the kinds apart. Until the photos arrive, plain stand-in frames mark where they go. Never shown in
// production. The choice is data-tut on <html> (0 is today's drawings); styles are in
// styles/tutors-lab.css. The winner replaces the drawings in page.tsx; this file goes.
import { useEffect, useState, type CSSProperties } from "react";
import "@/app/(site)/styles/tutors-lab.css";

const OPTIONS = [
  ["0", "Today"],
  ["1", "A. Staggered row"],
  ["2", "B. Fan of prints"],
  ["3", "C. One changing line"],
] as const;
/** How many stand-in photos to show. The real ones replace these. */
const PHOTOS = [0, 1, 2];

function Frame({ n }: { n: number }) {
  return (
    <span className="tut-frame" data-n={n}>
      <svg viewBox="0 0 100 120" aria-hidden="true">
        <circle cx="50" cy="46" r="19" />
        <path d="M14 120 C 14 86, 32 74, 50 74 C 68 74, 86 86, 86 120 Z" />
      </svg>
      <em>Your photo {n + 1}</em>
    </span>
  );
}

export default function TutorsLab({ kinds }: { kinds: [string, string][] }) {
  const [picked, setPicked] = useState("0");
  const [at, setAt] = useState(0);
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("tut") ?? "0";
    document.documentElement.dataset.tut = v;
    setPicked(v);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setAt((n) => n + 1);
    }, 2300);
    return () => clearInterval(timer);
  }, []);
  const pick = (v: string) => {
    const url = new URL(location.href);
    url.searchParams.set("tut", v);
    history.replaceState(null, "", url);
    document.documentElement.dataset.tut = v;
    setPicked(v);
  };
  const kind = at % kinds.length;
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

  return (
    <>
      {/* A. Staggered row: the photos stand at different heights and bob a little; the kinds sit beside */}
      <div className="tut tut-a rv">
        <div className="tut-row">
          {PHOTOS.map((n) => (
            <Frame key={n} n={n} />
          ))}
        </div>
        {list}
      </div>

      {/* B. Fan of prints: the photos overlap like prints in a hand; the front one goes to the back in turn */}
      <div className="tut tut-b rv">
        <div className="tut-fan">
          {PHOTOS.map((n) => (
            <span
              key={n}
              className="tut-print"
              style={{ "--p": (n + at) % PHOTOS.length } as CSSProperties}
            >
              <Frame n={n} />
            </span>
          ))}
        </div>
        {list}
      </div>

      {/* C. One changing line: small round photos, and one big line that changes from kind to kind */}
      <div className="tut tut-c rv">
        <div className="tut-faces">
          {PHOTOS.map((n) => (
            <Frame key={n} n={n} />
          ))}
        </div>
        <p className="tut-word" aria-live="off">
          <b key={kind}>{kinds[kind][0]}.</b>
          <span key={`l${kind}`}>{kinds[kind][1]}</span>
        </p>
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
