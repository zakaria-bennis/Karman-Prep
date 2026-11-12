"use client";

// The two private packages, side by side and the same size: Private 10 in shimmering black, Private 20 in
// shimmering blue with one badge, what it saves. The plan under the pointer (or holding the keyboard focus)
// lifts and lights up a little. Either button goes to the free-call form at the bottom of the page, and
// tells it which plan was chosen.
//
// TEMPORARY (2026-11-13): the badge comes in five designs for the founder to choose from, switched by the
// small row under the cards on the dev server only (private.css, "the one badge"):
//   1 a chip beside the plan's name            4 a round seal on the corner
//   2 the old price struck, the saving beside  5 a tab standing on the card's top edge
//   3 a ribbon across the top corner
import { useState } from "react";
import { Arrow } from "@/components/site/parts";

export interface Plan {
  name: string;
  price: string;
  each: string;
  /** The line under the price: "Everything in Pro", "Everything in Private 10, plus". */
  lead: string;
  bullets: string[];
  /** "Save 16%" */
  badge?: string;
  /** What a session costs on the other plan, shown struck through in badge design 2. */
  was?: string;
}

const PICK = process.env.NODE_ENV !== "production";

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

export default function PlanPicker({
  small,
  large,
  per,
  call,
}: {
  small: Plan;
  large: Plan;
  per: string;
  call: string;
}) {
  const [badge, setBadge] = useState(1);
  const card = (k: "small" | "large", p: Plan) => (
    <article className="pl" data-plan={k}>
      <div className="pl-top">
        <h3>{p.name}</h3>
        {p.badge ? <em className="pl-badge">{p.badge}</em> : null}
      </div>
      <p className="pl-price">
        <b className="num">{p.price}</b>
        <span>
          {p.was ? <s className="pl-was">{p.was}</s> : null}
          {p.each} {per}
          {p.badge ? <em className="pl-badge pl-in">{p.badge}</em> : null}
        </span>
      </p>
      <p className="pl-lead">{p.lead}</p>
      <ul>
        {p.bullets.map((x, i) => (
          <li key={x} style={{ "--i": i } as React.CSSProperties}>
            <Tick />
            {x}
          </li>
        ))}
      </ul>
      <a
        className="btn"
        href="#call"
        onClick={() => window.dispatchEvent(new CustomEvent("karman:plan", { detail: p.name }))}
      >
        <span className="lb">{call}</span>
        <span className="go">
          <Arrow />
        </span>
      </a>
    </article>
  );
  return (
    <>
      <div className="pls" data-badge={badge}>
        {card("small", small)}
        {card("large", large)}
      </div>
      {PICK ? (
        <p className="pl-pick">
          Badge
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={badge === n} onClick={() => setBadge(n)}>
              {n}
            </button>
          ))}
        </p>
      ) : null}
    </>
  );
}
