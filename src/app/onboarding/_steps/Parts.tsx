"use client";

// The pieces every guided form on the landscape shares (the plan-finder and the registration flight):
// the segmented progress with its back button, a score on a wheel, and a list of answers to pick one
// from. Styles: app/onboarding/intake.css.
import { useEffect, useLayoutEffect, useRef } from "react";

/** One segment for each question. Answered ones are full; the one on screen fills as it opens. */
export function Progress({
  total,
  at,
  onBack,
  canBack,
}: {
  total: number;
  /** The question on screen, counted from 1. 0 before the first; total + 1 when all are answered. */
  at: number;
  onBack: () => void;
  canBack: boolean;
}) {
  return (
    <div
      className="ob-seg"
      role="progressbar"
      aria-label="Progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(total, Math.max(0, at))}
    >
      <button type="button" onClick={onBack} disabled={!canBack} aria-label="Back">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path
            d="M12 4l-6 6 6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} data-s={i + 1 < at ? "done" : i + 1 === at ? "now" : undefined} />
      ))}
    </div>
  );
}

/** How tall one score is on the wheel, in pixels (intake.css gives each the same height). */
const ROW = 64;

/** A score on a wheel (founder, 2026-11-25: a scroller, not a text box and a slider). Scores step by 10
 *  from `min` to 1600, the higher ones above. Drag or scroll it, tap a score, or use the arrow keys; the
 *  one in the middle is the answer. With nothing chosen yet it rests on `start`. */
export function ScoreWheel({
  label,
  value,
  onChange,
  min = 400,
  start = 1200,
  off = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** The lowest score on the wheel: a goal never sits below the score already given. */
  min?: number;
  start?: number;
  /** Greyed out, when "No SAT yet" is ticked. */
  off?: boolean;
}) {
  const wheel = useRef<HTMLDivElement>(null);
  const top = 1600;
  const count = (top - min) / 10 + 1;
  const n = Math.min(top, Math.max(min, Math.round((Number(value) || start) / 10) * 10));
  const row = (top - n) / 10;

  // the wheel always holds a real score, so the form never has to ask for one again
  useEffect(() => {
    if (!off && value !== String(n)) onChange(String(n));
  }, [off, value, n, onChange]);

  // keep the wheel on the score when it is set from outside (first paint, or a new lowest score)
  useLayoutEffect(() => {
    const el = wheel.current;
    if (el && Math.round(el.scrollTop / ROW) !== row) el.scrollTop = row * ROW;
  }, [row, count]);

  const turnTo = (to: number, smooth = true) => {
    const next = Math.min(count - 1, Math.max(0, to));
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    wheel.current?.scrollTo({ top: next * ROW, behavior: smooth && !still ? "smooth" : "auto" });
  };
  const keys: Record<string, number> = {
    ArrowUp: row - 1,
    ArrowDown: row + 1,
    PageUp: row - 10,
    PageDown: row + 10,
    Home: count - 1,
    End: 0,
  };

  return (
    <div className="ob-wheel" data-off={off || undefined}>
      <div
        ref={wheel}
        role="spinbutton"
        tabIndex={off ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={top}
        aria-valuenow={n}
        aria-disabled={off || undefined}
        onScroll={(e) => {
          const at = Math.round(e.currentTarget.scrollTop / ROW);
          const score = top - Math.min(count - 1, Math.max(0, at)) * 10;
          if (!off && score !== n) onChange(String(score));
        }}
        onKeyDown={(e) => {
          if (!(e.key in keys)) return;
          e.preventDefault();
          turnTo(keys[e.key]);
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <button
            type="button"
            tabIndex={-1}
            key={i}
            data-near={Math.min(2, Math.abs(i - row))}
            aria-hidden={i !== row || undefined}
            onClick={() => turnTo(i)}
          >
            {top - i * 10}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Pick one. */
export function Options<T extends string | number>({
  label,
  options,
  value,
  onChange,
  row,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (v: T) => void;
  /** Dates ("March 2027"): side by side in one row, the month over its year, as many as the screen
   *  holds comfortably (a phone shows the first three or four). An answer with no year in it
   *  ("Not sure yet") runs the full width under them. Founder, 2026-11-25. */
  row?: boolean;
}) {
  return (
    <div className={row ? "ob-opts ob-row" : "ob-opts"} role="radiogroup" aria-label={label}>
      {options.map(([id, text]) => {
        const dated = row ? /^(.+) (\d{4})$/.exec(text) : null;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={value === id}
            data-wide={row && !dated ? "" : undefined}
            key={String(id)}
            onClick={() => onChange(id)}
          >
            {dated ? (
              <>
                <b>{dated[1]}</b>
                <small>{dated[2]}</small>
              </>
            ) : (
              text
            )}
          </button>
        );
      })}
    </div>
  );
}
