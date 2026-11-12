"use client";

// The two private packages, side by side. Private 20 is the one we recommend: it starts pinned, larger than
// Private 10. Hovering a plan lifts it; clicking anywhere on a plan pins it as the larger one. Either
// button goes to the free-call form at the bottom of the page, and tells it which plan was chosen.
import { useState } from "react";
import { Arrow } from "@/components/site/parts";

export interface Plan {
  name: string;
  price: string;
  each: string;
  bullets: string[];
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
  plus,
  best,
  per,
  call,
}: {
  small: Plan;
  large: Plan;
  /** "Everything in Private 10, plus" */
  plus: string;
  best: string;
  per: string;
  call: string;
}) {
  const [pin, setPin] = useState<"small" | "large">("large");
  const card = (k: "small" | "large", p: Plan) => (
    <article
      className="pl"
      data-plan={k}
      data-pin={pin === k || undefined}
      onClick={() => setPin(k)}
    >
      {k === "large" ? <em>{best}</em> : null}
      <h3>
        <button type="button" aria-pressed={pin === k} onClick={() => setPin(k)}>
          {p.name}
        </button>
      </h3>
      <p className="pl-price">
        <b className="num">{p.price}</b>
        <span>
          {p.each} {per}
        </span>
      </p>
      {k === "large" ? <p className="pl-plus">{plus}</p> : null}
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
    <div className="pls" data-pin={pin}>
      {card("small", small)}
      {card("large", large)}
    </div>
  );
}
