"use client";

// The promise, by starting score: a sliding switch of score bands and the points promised for the one
// picked, counted up to. With `from`, it also shows the score the promise leads to (the opening uses that).
// Everything it shows comes in as props, so the site's facts and words stay on the server.
import { useEffect, useRef, useState } from "react";

/** A number that counts from its last value to the new one. */
function Ticker({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 650);
      const v = Math.round(start + (value - start) * (1 - (1 - t) ** 3));
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return (
    <b className="num">
      {prefix}
      {shown}
    </b>
  );
}

export default function ProgramPromise({
  ask,
  bands,
  gains,
  promise,
  highTitle,
  high,
}: {
  ask: string;
  /** One label per band; the last is the "and up" band. */
  bands: string[];
  /** Points promised for each band but the last. */
  gains: number[];
  promise: string;
  highTitle: string;
  high: string;
}) {
  const [at, setAt] = useState(0);
  const gain = gains[at];
  return (
    <div className="pg-promise">
      <p className="pg-asking">{ask}</p>
      <div
        className="pg-seg"
        role="radiogroup"
        aria-label={ask}
        style={{ "--n": bands.length, "--at": at } as React.CSSProperties}
      >
        {bands.map((label, i) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={i === at}
            onClick={() => setAt(i)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="pg-gain" aria-live="polite">
        {gain === undefined ? (
          <>
            <b key="high">{highTitle}</b>
            <span>{high}</span>
          </>
        ) : (
          <>
            <Ticker value={gain} prefix="+" />
            <span>{promise}</span>
          </>
        )}
      </p>
    </div>
  );
}
