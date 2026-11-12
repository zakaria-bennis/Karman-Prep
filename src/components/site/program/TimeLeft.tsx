"use client";

// A ticking countdown to a date (registration closing), drawn one of five ways (`look`). The server's
// count shows first and the browser takes over. It takes the dates and its words as props on purpose:
// importing the site's facts or words here would ship them all to the browser.
import { useEffect, useState } from "react";

export type ClockLook = "boxes" | "plain" | "flip" | "line" | "ring";

const left = (until: string) =>
  Math.max(0, Math.floor((Date.parse(`${until}T23:59:59`) - Date.now()) / 1000));

export default function TimeLeft({
  until,
  opens,
  label,
  units,
  sentence,
  look,
}: {
  until: string;
  /** When registration opened: the bar and the ring show how much of the window is left. */
  opens: string;
  label: string;
  units: string[];
  sentence: string;
  look: ClockLook;
}) {
  const [s, set] = useState(() => left(until));
  useEffect(() => {
    set(left(until));
    const t = setInterval(() => set(left(until)), 1000);
    return () => clearInterval(t);
  }, [until]);
  const parts = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
  const whole = (Date.parse(`${until}T23:59:59`) - Date.parse(`${opens}T00:00:00`)) / 1000;
  const share = Math.min(1, Math.max(0, s / whole));
  const two = (v: number) => String(v).padStart(2, "0");
  if (look === "line")
    return (
      <div
        className="pg-clock"
        data-look="line"
        role="timer"
        aria-label={label}
        suppressHydrationWarning
      >
        <p suppressHydrationWarning>
          <b className="num">{parts[0]}</b> {units[0]}, <b className="num">{parts[1]}</b> {units[1]}
          , <b className="num">{two(parts[2])}</b> {units[2]} {sentence}
        </p>
        <i style={{ "--v": share } as React.CSSProperties} />
      </div>
    );
  if (look === "ring")
    return (
      <div
        className="pg-clock"
        data-look="ring"
        role="timer"
        aria-label={label}
        suppressHydrationWarning
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" />
          <circle cx="60" cy="60" r="52" pathLength={1} strokeDasharray={`${share} 1`} />
        </svg>
        <b className="num" suppressHydrationWarning>
          {parts[0]}
        </b>
        <p suppressHydrationWarning>
          {units[0]} {sentence}
          <span className="num">
            {two(parts[1])}:{two(parts[2])}:{two(parts[3])}
          </span>
        </p>
      </div>
    );
  return (
    <div className="pg-clock" data-look={look} role="timer" aria-label={label}>
      <p>{label}</p>
      <ol suppressHydrationWarning>
        {parts.map((v, i) => (
          <li key={units[i]}>
            <b className="num" key={v} suppressHydrationWarning>
              {two(v)}
            </b>
            <span>{units[i]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
