"use client";

// The schools page's opening sum: drag the number of students, and see what the first year costs (nothing)
// and what every year after it costs, at the price per student from offer.ts. Facts and words come in as
// props, so the numbers stay in offer.ts and the words in site-copy.ts.
import { useId, useState } from "react";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function SeatSum({
  perStudent,
  min,
  max,
  step,
  start,
  w,
}: {
  /** Dollars per student a year, after the free first year. */
  perStudent: number;
  min: number;
  max: number;
  step: number;
  start: number;
  w: { ask: string; unit: string; first: string; after: string; afterNote: string; family: string };
}) {
  const id = useId();
  const [n, setN] = useState(start);
  const along = (n - min) / (max - min);
  return (
    <div className="au-sum">
      <div className="au-dial">
        <label htmlFor={id}>{w.ask}</label>
        <output htmlFor={id} className="num" key={n}>
          {n.toLocaleString("en-US")} <span>{w.unit}</span>
        </output>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          aria-valuetext={`${n} ${w.unit}`}
          style={{ "--v": along } as React.CSSProperties}
        />
      </div>
      <div className="au-tiles">
        <p className="au-tile au-free">
          <span>{w.first}</span>
          <b className="num">{usd(0)}</b>
        </p>
        <p className="au-tile">
          <span>{w.after}</span>
          <b className="num" key={n}>
            {usd(n * perStudent)}
          </b>
          <small>{w.afterNote}</small>
        </p>
      </div>
      <p className="au-aside">{w.family}</p>
    </div>
  );
}
