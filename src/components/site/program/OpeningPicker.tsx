"use client";

// TEMPORARY (2026-11-11): shows one of the Program page's openings and, on the development server only, a
// small panel to switch between them, so the founder can choose. A live build shows the first and no panel.
// Delete this file, the two openings that lose (ProgramSections.tsx, program.css) and their words when he
// picks.
import { useEffect, useState, type ReactNode } from "react";

export default function OpeningPicker({
  names,
  children,
}: {
  names: string[];
  children: ReactNode[];
}) {
  const dev = process.env.NODE_ENV !== "production";
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!dev) return;
    const asked = Number(new URLSearchParams(location.search).get("opening"));
    if (asked > 0 && asked <= names.length) setAt(asked - 1);
  }, [dev, names.length]);
  return (
    <>
      {children[at]}
      {dev ? (
        <div className="pg-pick" role="group" aria-label="Opening options">
          {names.map((n, i) => (
            <button key={n} type="button" aria-pressed={i === at} onClick={() => setAt(i)}>
              {n}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
