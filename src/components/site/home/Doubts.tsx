"use client";

// The parent's real questions, as bubbles they can tap. The chosen question becomes a dark bubble and its
// answer springs in beside it; the others wait, floating a little. One answer is open from the start so the
// section never looks empty. The page passes every word in.
import { useState } from "react";

export default function Doubts({ items, label }: { items: [string, string][]; label: string }) {
  const [at, setAt] = useState(0);
  const [q, a] = items[at];
  /* an answer may lead with one short sentence, set large */
  const cut = a.indexOf(". ");
  const [lead, rest] = cut > 0 ? [a.slice(0, cut + 1), a.slice(cut + 2)] : [a, ""];
  return (
    <div className="doubts">
      <div className="talk" key={at} aria-live="polite">
        <p className="q">{q}</p>
        <p className="a">
          <b>{lead}</b>
          {rest ? <span>{rest}</span> : null}
        </p>
      </div>
      <ul className="asks" aria-label={label}>
        {items.map(([question], i) =>
          i === at ? null : (
            <li key={question} style={{ animationDelay: `${i * -1.3}s` }}>
              <button type="button" onClick={() => setAt(i)}>
                {question}
              </button>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
