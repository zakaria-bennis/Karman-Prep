"use client";

// The pieces every guided form on the landscape shares (the plan-finder and the registration flight):
// the segmented progress with its back button, a written score with a slider under it, and a list of
// answers to pick one from. Styles: app/onboarding/intake.css.
import type { CSSProperties } from "react";

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

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

/** A score from 400 to 1600: typed into a pill whose name rises as it fills, or set with the slider
 *  under it. The two always agree. */
export function ScoreField({
  label,
  value,
  onChange,
  bad,
  off = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  bad?: boolean;
  /** Greyed out, when "No SAT yet" is ticked. */
  off?: boolean;
}) {
  const n = Math.min(1600, Math.max(400, Number(value) || 1000));
  return (
    <div className="ob-score" data-off={off || undefined}>
      <label
        className="rs-pill"
        data-bad={bad || undefined}
        data-filled={value && !off ? true : undefined}
      >
        <span>{label}</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          disabled={off}
          value={off ? "" : value}
          aria-invalid={bad || undefined}
          onChange={(e) => onChange(digits(e.target.value))}
        />
      </label>
      <div className="ob-range" style={{ "--p": (n - 400) / 1200 } as CSSProperties}>
        <input
          type="range"
          min={400}
          max={1600}
          step={10}
          value={n}
          disabled={off}
          aria-label={`${label}, slider`}
          onChange={(e) => onChange(e.target.value)}
        />
        <div aria-hidden="true">
          <span>400</span>
          <span>1000</span>
          <span>1600</span>
        </div>
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
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="ob-opts" role="radiogroup" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === id}
          key={String(id)}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
