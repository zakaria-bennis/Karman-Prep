"use client";

// The simple Pricing page: one headline, one switch (self-study or with a tutor), the plans on that side,
// and a link to the guarantee. The cohort card holds its own start-date choice and the scholarship badge;
// pressing the badge dims the page and opens a small placard that explains the scholarship. The placard
// closes on a click anywhere, its X, or Escape.
//
// TEMPORARY (2026-11-13): five layouts for the founder to choose from, switched by the small row at the
// bottom on the dev server only (pricing-lab.css):
//   1 Frosted cards   tinted glass cards in a row
//   2 Price list      one glass panel, a row per plan, like a menu
//   3 Spotlight       plan names as tabs, one plan shown large
//   4 Side by side    a small table: price, teaching, promise
//   5 Bare type       no cards; large prices set straight on the landscape
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Arrow } from "@/components/site/parts";
import FoxCheer, { Confetti } from "@/components/site/private/FoxCheer";
import type { LabAward, LabPlan, LabProps } from "./pricing-lab-data";

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

function Seal() {
  return (
    <svg className="pz-seal" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.6l2.1 1.5 2.6-.1.8 2.500 2.100 1.500-.8 2.500.8 2.500-2.100 1.500-.8 2.500-2.600-.1L10 18.400l-2.100-1.500-2.600.1-.8-2.500-2.100-1.500.8-2.500-.8-2.500 2.100-1.500.8-2.500 2.600.1z" />
      <path d="M6.600 10.200l2.300 2.300 4.500-4.800" className="pz-seal-tick" />
    </svg>
  );
}

function Medal() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 1.5h8l-2.2 6H8.2z" opacity=".55" />
      <circle cx="10" cy="12.5" r="5.5" />
      <path d="M10 9.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.400 2-.3z" className="pz-star" />
    </svg>
  );
}

/** The scholarship placard: what is paid, to whom, and how. */
function AwardCard({ a, onClose }: { a: LabAward; onClose: () => void }) {
  const x = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    x.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="pz-dim" onClick={onClose}>
      <div className="pz-pop" role="dialog" aria-modal="true" aria-labelledby="pz-pop-h">
        <button className="pz-x" type="button" aria-label={a.close} ref={x} onClick={onClose}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
        <p className="pz-only">{a.only}</p>
        <h2 id="pz-pop-h">{a.title}</h2>
        <p className="pz-who">{a.who}</p>
        <div className="pz-parts">
          {a.parts.map((p, i) => (
            <p key={p.amount} style={{ "--i": i } as CSSProperties}>
              <b className="num">{p.amount}</b>
              <span>{p.label}</span>
            </p>
          ))}
        </div>
        <ul className="pz-how">
          {a.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="pz-fox" aria-hidden="true">
          <Confetti />
          <FoxCheer />
          <svg className="pz-ribbon" viewBox="0 0 60 44">
            <path d="M18 0l8 20h8l8-20z" />
            <circle cx="30" cy="28" r="14" />
            <path d="M30 20l2.400 5 5.400.7-4 3.800 1 5.400-4.800-2.600-4.800 2.600 1-5.400-4-3.800 5.400-.7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function PricingLab({ headline, sides, self, tutor, rows, words, links }: LabProps) {
  const [side, setSide] = useState<"self" | "tutor">("tutor");
  const [look, setLook] = useState(0);
  const [when, setWhen] = useState(0);
  const [focus, setFocus] = useState<Record<string, string>>({});
  const [pop, setPop] = useState<LabAward | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const plans = side === "self" ? self : tutor;
  const shown = plans.find((p) => p.id === focus[side]) ?? plans.find((p) => p.best) ?? plans[0];
  const close = () => {
    setPop(null);
    opener.current?.focus();
  };

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
      <button
        className="pz-award"
        type="button"
        aria-haspopup="dialog"
        onClick={(e) => {
          opener.current = e.currentTarget;
          setPop(p.award ?? null);
        }}
      >
        <Medal />
        <span>
          <b>{p.award.badge}</b>
          <i>{p.award.only}</i>
        </span>
      </button>
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
  const head = (p: LabPlan) => (
    <div className="pz-head">
      <p className="pz-tag">{p.tag}</p>
      <h2>{p.name}</h2>
      <p className="pz-line" data-sealed={p.sealed || undefined}>
        {p.sealed ? <Seal /> : null}
        {p.line}
      </p>
    </div>
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
      {head(p)}
      {price(p)}
      {cohortPick(p)}
      {go(p)}
      {bullets(p)}
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
              <p className="pz-tag">{p.tag}</p>
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
      {pop ? <AwardCard a={pop} onClose={close} /> : null}
    </section>
  );
}
