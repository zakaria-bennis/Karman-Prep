"use client";

// The promise, by starting score: a sliding switch of score bands and the points promised for the one
// picked. Everything it shows comes in as props, so the site's facts and words stay on the server.
import { useState } from "react";

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
      <p id="pg-ask">{ask}</p>
      <div
        className="pg-seg"
        role="radiogroup"
        aria-labelledby="pg-ask"
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
            <b key={gain} className="num">
              +{gain}
            </b>
            <span>{promise}</span>
          </>
        )}
      </p>
    </div>
  );
}
