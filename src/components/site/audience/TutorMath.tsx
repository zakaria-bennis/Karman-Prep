"use client";

// The tutors page's opening sum: drag how many students are on your code, and see what the plan costs per
// student a month, beside what those students would pay for the same plan on their own. Prices come in as
// props from offer.ts, words from site-copy.ts.
import { useId, useState } from "react";

const cents = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function TutorMath({
  monthly,
  practiceMonthly,
  max,
  start,
  w,
}: {
  /** The tutor plan's price a month. */
  monthly: number;
  /** What one student pays for the same student plan on their own, a month. */
  practiceMonthly: number;
  /** The most students on one code. */
  max: number;
  start: number;
  w: { ask: string; unit: string; per: string; alone: string; aloneUnit: string; note: string };
}) {
  const id = useId();
  const [n, setN] = useState(start);
  const along = (n - 1) / (max - 1);
  return (
    <div className="au-sum">
      <div className="au-dial">
        <label htmlFor={id}>{w.ask}</label>
        <output htmlFor={id} className="num" key={n}>
          {n} <span>{w.unit}</span>
        </output>
        <input
          id={id}
          type="range"
          min={1}
          max={max}
          step={1}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          aria-valuetext={`${n} ${w.unit}`}
          style={{ "--v": along } as React.CSSProperties}
        />
      </div>
      <div className="au-tiles">
        <p className="au-tile au-free">
          <span>{w.per}</span>
          <b className="num" key={n}>
            {cents(monthly / n)}
          </b>
        </p>
        <p className="au-tile">
          <span>{w.alone}</span>
          <b className="num" key={`a${n}`}>
            {usd(n * practiceMonthly)}
          </b>
          <small>{w.aloneUnit}</small>
        </p>
      </div>
      <p className="au-aside">{w.note}</p>
    </div>
  );
}
