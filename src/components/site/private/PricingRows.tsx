"use client";

// TEMPORARY with PrivatePricing.tsx (design 2): the packages as rows to pick. The recommended one starts
// picked; the picked row opens into its details, and the summary under the rows shows the price, what one
// session comes to, and the saving where there is one. Everything shown comes in as props.
import { useState } from "react";

interface Pack {
  name: string;
  sessions: number;
  price: string;
  each: string;
  rows: [string, string][];
  saved?: string;
  singly?: string;
}

export default function PricingRows({
  choose,
  best,
  per,
  sessionsWord,
  single,
  save,
  call,
  both,
  packs,
}: {
  choose: string;
  best: string;
  per: string;
  sessionsWord: string;
  single: string;
  save: string;
  call: string;
  both: string[];
  packs: Pack[];
}) {
  const [at, setAt] = useState(0);
  const p = packs[at];
  return (
    <div className="pp-rows">
      <div role="radiogroup" aria-label={choose}>
        {packs.map((x, i) => (
          <button
            key={x.name}
            type="button"
            role="radio"
            aria-checked={i === at}
            data-best={i === 0 || undefined}
            onClick={() => setAt(i)}
          >
            {i === 0 ? <em>{best}</em> : null}
            <span className="pp-dot" aria-hidden="true" />
            <span className="pp-name">
              <b>{x.name}</b>
              <small>
                {x.sessions} {sessionsWord}, {x.each} {per}
              </small>
            </span>
            <strong className="num">{x.price}</strong>
            <dl>
              {x.rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </button>
        ))}
      </div>
      <aside key={at}>
        <p className="pp-total">
          <span>{p.name}</span>
          <b className="num">{p.price}</b>
        </p>
        {p.saved ? (
          <p className="pp-saved">
            {single} <s className="num">{p.singly}</s> {save} <b className="num">{p.saved}</b>.
          </p>
        ) : null}
        <ul>
          {both.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <a className="btn" href="#call">
          <span className="lb">{call}</span>
        </a>
      </aside>
    </div>
  );
}
