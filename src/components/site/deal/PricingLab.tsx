"use client";

// The simple Pricing page: one headline, one switch (self-study or with a tutor), the plans on that side,
// and a link to the guarantee. The cohort card holds its own start-date choice and the scholarship badge.
//
// TEMPORARY (2026-11-13): five layouts for the founder to choose from, switched by the small row at the
// bottom on the dev server only (pricing-lab.css):
//   1 Frosted cards   tinted glass cards in a row
//   2 Price list      one glass panel, a row per plan, like a menu
//   3 Spotlight       plan names as tabs, one plan shown large
//   4 Side by side    a small table: price, teaching, promise
//   5 Bare type       no cards; large prices set straight on the landscape
import { useState, type CSSProperties } from "react";
import { Arrow } from "@/components/site/parts";
import type { LabPlan, LabProps } from "./pricing-lab-data";

const PICK = process.env.NODE_ENV !== "production";
const LOOKS = ["cards", "list", "spot", "table", "bare"] as const;
const NAMES = ["Frosted cards", "Price list", "Spotlight", "Side by side", "Bare type"];

function Check() {
  return (
    <svg className="pz-check" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  );
}

function Medal() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 1.5h8l-2.2 6H8.2z" opacity=".55" />
      <circle cx="10" cy="12.5" r="5.5" />
      <path d="M10 9.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" className="pz-star" />
    </svg>
  );
}

export default function PricingLab({ headline, sides, self, tutor, rows, words, links }: LabProps) {
  const [side, setSide] = useState<"self" | "tutor">("tutor");
  const [look, setLook] = useState(0);
  const [when, setWhen] = useState(0);
  const [focus, setFocus] = useState<Record<string, string>>({});
  const plans = side === "self" ? self : tutor;
  const shown = plans.find((p) => p.id === focus[side]) ?? plans.find((p) => p.best) ?? plans[0];

  const cohortPick = (p: LabPlan) =>
    p.cohorts ? (
      <div className="pz-when">
        <span>{words.starts}</span>
        <div role="radiogroup" aria-label={words.starts}>
          {p.cohorts.map((c, i) => (
            <button
              key={c.starts}
              type="button"
              role="radio"
              aria-checked={when === i}
              onClick={() => setWhen(i)}
            >
              {c.starts}
            </button>
          ))}
        </div>
        <small aria-live="polite">
          {words.closes} {p.cohorts[when].closes}
        </small>
      </div>
    ) : null;
  const award = (p: LabPlan) =>
    p.award ? (
      <p className="pz-award">
        <Medal />
        {p.award}
      </p>
    ) : null;
  const go = (p: LabPlan) => (
    <a className="btn pz-go" href={p.href}>
      <span className="lb">{p.cta}</span>
      <span className="go">
        <Arrow />
      </span>
    </a>
  );
  const price = (p: LabPlan) => (
    <p className="pz-price">
      <b className="num">{p.price}</b>
      <span>{p.unit}</span>
      {p.note ? <small>{p.note}</small> : null}
    </p>
  );
  const bullets = (p: LabPlan) => (
    <ul className="pz-list">
      {p.bullets.map((x) => (
        <li key={x}>
          <Check />
          {x}
        </li>
      ))}
    </ul>
  );
  const card = (p: LabPlan, i: number) => (
    <article
      className="pz-card"
      key={p.id}
      data-plan={p.id}
      data-best={p.best || undefined}
      style={{ "--i": i } as CSSProperties}
    >
      {award(p)}
      <div className="pz-head">
        <h2>{p.name}</h2>
        <p className="pz-line">{p.line}</p>
      </div>
      {price(p)}
      {cohortPick(p)}
      {bullets(p)}
      {go(p)}
    </article>
  );

  let body;
  if (LOOKS[look] === "spot")
    body = (
      <div className="pz-spot" key={side}>
        <div className="pz-tabs" role="tablist">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === shown.id}
              onClick={() => setFocus((f) => ({ ...f, [side]: p.id }))}
            >
              {p.name}
            </button>
          ))}
        </div>
        {card(shown, 0)}
      </div>
    );
  else if (LOOKS[look] === "table")
    body = (
      <div
        className="pz-table"
        key={side}
        style={{ "--n": plans.length } as CSSProperties}
        role="table"
      >
        <div className="pz-col pz-labels" aria-hidden="true">
          <span />
          {rows.map((r) => (
            <span key={r}>{r}</span>
          ))}
          <span />
        </div>
        {plans.map((p, i) => (
          <article
            className="pz-col"
            key={p.id}
            data-plan={p.id}
            data-best={p.best || undefined}
            style={{ "--i": i } as CSSProperties}
          >
            <div className="pz-head">
              <h2>{p.name}</h2>
              {award(p)}
              {cohortPick(p)}
            </div>
            <p className="pz-cell" data-label={rows[0]}>
              <b className="num">{p.price}</b>
              <small>{p.unit}</small>
            </p>
            <p className="pz-cell" data-label={rows[1]}>
              {p.teach}
            </p>
            <p className="pz-cell" data-label={rows[2]}>
              {p.promise}
            </p>
            {go(p)}
          </article>
        ))}
      </div>
    );
  else
    body = (
      <div className="pz-cards" key={side} style={{ "--n": plans.length } as CSSProperties}>
        {plans.map(card)}
      </div>
    );

  return (
    <section className="pg-hero pz" data-look={LOOKS[look]} data-side={side} id="top">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in">
        <h1>{headline}</h1>
        <div className="pz-switch" role="tablist">
          <i aria-hidden="true" />
          {(["self", "tutor"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={side === k}
              onClick={() => setSide(k)}
            >
              {sides[k]}
            </button>
          ))}
        </div>
        {body}
        <p className="pz-foot">
          {side === "self" ? (
            <a href={links.free}>{words.freeNote}</a>
          ) : (
            <a href={links.guarantee}>{words.link}</a>
          )}
        </p>
        {PICK ? (
          <p className="pz-pick">
            {NAMES.map((n, i) => (
              <button key={n} type="button" aria-pressed={look === i} onClick={() => setLook(i)}>
                {i + 1} {n}
              </button>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
