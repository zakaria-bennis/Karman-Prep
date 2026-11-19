"use client";
// The one big thing on a set's start and end screens (founder, 2026-11-19: the first tries were
// "bland"): a ring with a bead for every question. Before the set the beads are empty glass; after
// it each is green or red in the order answered, the ring is drawn round to the share that was
// right, and a bead can be pressed to see that answer. What stands in the middle is the caller's.
import type { CSSProperties, ReactNode } from "react";
import r from "./ring.module.css";

export type Bead = { right: boolean } | null;

export function SetRing({
  beads,
  share = 0,
  chosen = null,
  onChoose,
  children,
}: {
  /** One for each question, in order: null while unanswered. */
  beads: Bead[];
  /** How much of the ring is drawn, 0 to 1. */
  share?: number;
  chosen?: number | null;
  onChoose?: (index: number) => void;
  children: ReactNode;
}) {
  const n = beads.length;
  const R = 44; // of a 100-wide square
  const round = 2 * Math.PI * R;
  return (
    <div className={r.ring} style={{ "--n": n } as CSSProperties}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className={r.track} cx="50" cy="50" r={R} />
        <circle
          className={r.drawn}
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={round}
          style={{ "--gap": round * (1 - share), "--round": round } as CSSProperties}
        />
      </svg>
      {beads.map((bead, i) => {
        const turn = (i / n) * 2 * Math.PI - Math.PI / 2;
        const at = {
          left: `${50 + R * Math.cos(turn)}%`,
          top: `${50 + R * Math.sin(turn)}%`,
          "--i": i,
        } as CSSProperties;
        const state = bead === null ? undefined : bead.right ? "right" : "miss";
        return onChoose && bead ? (
          <button
            key={i}
            type="button"
            className={r.bead}
            style={at}
            data-state={state}
            aria-pressed={chosen === i}
            aria-label={`Question ${i + 1}: ${bead.right ? "right" : "missed"}`}
            onClick={() => onChoose(i)}
          >
            {i + 1}
          </button>
        ) : (
          <span key={i} className={r.bead} style={at} data-state={state} aria-hidden="true">
            {i + 1}
          </span>
        );
      })}
      <div className={r.middle}>{children}</div>
    </div>
  );
}

/** The four levels as stops on a line, with a marker that travels from where the skill was to
 *  where it is now. */
export function LevelTrail({
  names,
  from,
  to,
  marker,
}: {
  names: readonly string[];
  from: number;
  to: number;
  marker: ReactNode;
}) {
  const last = names.length - 1;
  return (
    <div
      className={r.trail}
      style={{ "--from": from / last, "--to": to / last } as CSSProperties}
      data-moved={to !== from || undefined}
      role="img"
      aria-label={`Level: ${names[to]}`}
    >
      <div className={r.line}>
        <i />
        <span className={r.marker}>{marker}</span>
      </div>
      <ol>
        {names.map((name, i) => (
          <li key={name} data-on={i <= to || undefined} data-here={i === to || undefined}>
            {name}
          </li>
        ))}
      </ol>
    </div>
  );
}
