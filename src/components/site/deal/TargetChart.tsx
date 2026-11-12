"use client";

// The target, by starting score, as a bar chart you can point at: one pair of bars per band of starting
// scores (the cohort and Private 10, then Private 20), shrinking as the start rises, because a higher score
// has less room to climb. Picking a band reads its targets out above the chart, counting to the new number.
// The bars rise in turn when the section arrives (deal.css). Facts and words come in as props from the
// server (offer.ts, site-copy.ts section 56).
import { useState, type CSSProperties } from "react";

export type TargetBand = {
  /** "1200 or lower" */
  label: string;
  /** The band's line from the copy, read out in full when it is picked. */
  text: string;
  /** Points promised; absent for the band with no points target. */
  cohort?: number;
  private?: number;
};

export default function TargetChart({
  bands,
  legend,
  ask,
}: {
  bands: TargetBand[];
  /** [the cohort and Private 10, Private 20] */
  legend: [string, string];
  ask: string;
}) {
  const [at, setAt] = useState(0);
  const top = Math.max(...bands.map((b) => b.private ?? 0), 1);
  const b = bands[at];
  return (
    <figure className="co-card dl-targets">
      <div className="dl-read" aria-live="polite">
        {b.cohort !== undefined && b.private !== undefined ? (
          <p className="dl-pair" key={at}>
            <span className="c">
              <b className="num">+{b.cohort}</b>
              <small>{legend[0]}</small>
            </span>
            <span className="p">
              <b className="num">+{b.private}</b>
              <small>{legend[1]}</small>
            </span>
          </p>
        ) : null}
        <p className="dl-line" key={`t${at}`}>
          {b.text}
        </p>
      </div>
      <div className="dl-bars" role="radiogroup" aria-label={ask}>
        {bands.map((x, i) => (
          <button
            key={x.label}
            type="button"
            role="radio"
            aria-checked={i === at}
            onClick={() => setAt(i)}
            style={{ "--k": i } as CSSProperties}
          >
            <span className="dl-pairbars" aria-hidden="true">
              {x.cohort !== undefined ? (
                <i className="c" style={{ "--v": x.cohort / top } as CSSProperties} />
              ) : null}
              {x.private !== undefined ? (
                <i className="p" style={{ "--v": x.private / top } as CSSProperties} />
              ) : (
                <i className="none" />
              )}
            </span>
            <span className="dl-band">{x.label}</span>
          </button>
        ))}
      </div>
      <figcaption className="dl-legend">
        <span className="c">{legend[0]}</span>
        <span className="p">{legend[1]}</span>
      </figcaption>
    </figure>
  );
}
