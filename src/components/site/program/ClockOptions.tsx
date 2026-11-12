"use client";

// TEMPORARY (2026-11-12): the countdown drawn five ways, for the founder to choose between. A small panel
// switches them on the development server only; a live build shows the first and no panel. When he picks,
// TimeLeft keeps that one look, and this file, the panel's styles and the other looks' styles go.
import { useEffect, useState } from "react";
import TimeLeft, { type ClockLook } from "./TimeLeft";

const LOOKS: [ClockLook, string][] = [
  ["boxes", "1. Ink boxes"],
  ["plain", "2. Big numerals"],
  ["flip", "3. Departure board"],
  ["line", "4. One sentence"],
  ["ring", "5. Ring"],
];

export default function ClockOptions(props: {
  until: string;
  opens: string;
  label: string;
  units: string[];
  sentence: string;
}) {
  const dev = process.env.NODE_ENV !== "production";
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!dev) return;
    const asked = Number(new URLSearchParams(location.search).get("clock"));
    if (asked > 0 && asked <= LOOKS.length) setAt(asked - 1);
  }, [dev]);
  return (
    <>
      <TimeLeft {...props} look={LOOKS[at][0]} />
      {dev ? (
        <div className="pg-pick" role="group" aria-label="Countdown options">
          {LOOKS.map(([, name], i) => (
            <button key={name} type="button" aria-pressed={i === at} onClick={() => setAt(i)}>
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
