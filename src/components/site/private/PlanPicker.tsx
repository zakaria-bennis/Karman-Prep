"use client";

// The two private packages, side by side and the same size: Private 10 in shimmering black, Private 20 in
// shimmering blue with one ribbon across its corner, what it saves. The plan under the pointer (or holding the keyboard focus)
// lifts and lights up a little. Either button goes to the free-call form at the bottom of the page, and
// tells it which plan was chosen.
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
}

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
  const card = (k: "small" | "large", p: Plan) => (
    <article className="pl" data-plan={k}>
      {p.badge ? (
        <em className="pl-rib">
          <span>{p.badge}</span>
        </em>
      ) : null}
      <h3>{p.name}</h3>
      <p className="pl-price">
        <b className="num">{p.price}</b>
        <span>
          {p.each} {per}
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
    <div className="pls">
      {card("small", small)}
      {card("large", large)}
    </div>
  );
}
