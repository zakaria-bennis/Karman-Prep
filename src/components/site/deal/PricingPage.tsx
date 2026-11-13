"use client";

// The Pricing page: one headline, one switch (self-study or with a tutor), the plans on that side as
// frosted glass cards, each in its own colour, and a link to the guarantee.
//   Self-study plans carry a 3 months / Monthly choice; 3 months is the default and shows its price a month.
//   The cohort card holds the choice of SAT (each cohort ends on one) and the scholarship badge. Pressing
//   the badge dims the page and opens a small placard about the scholarship; it closes on a click anywhere,
//   its X, or Escape.
// Words and numbers arrive as props from pricing-data.ts. Styles: pricing.css.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Fox } from "@/components/portal/Fox";
import { Arrow } from "@/components/site/parts";
import { Confetti } from "@/components/site/private/FoxCheer";
import type { PriceAward, PricePlan, PriceProps } from "./pricing-data";

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
      <circle cx="10" cy="10" r="9" />
      <path d="M6.2 10.3l2.500 2.500 5-5.300" className="pz-seal-tick" />
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

/** The fox with the medal on: its ribbon runs round the neck and the medal rests on the chest. */
function FoxWithMedal() {
  return (
    <div className="fxc pz-foxy">
      <Fox size={112} />
      <svg className="pz-torso" viewBox="0 0 120 76" aria-hidden="true">
        <path d="M8 76C8 40 32 12 60 12s52 28 52 64z" fill="#E89A2C" />
        <path d="M40 76c0-26 9-48 20-48s20 22 20 48z" fill="#FFF8EE" />
        <path d="M30 22l12-7 22 34-9 6z" fill="#2449b8" />
        <path d="M90 22l-12-7-22 34 9 6z" fill="#1a37a0" />
        <g className="pz-gold">
          <circle cx="60" cy="56" r="13" fill="#f0c25c" stroke="#b98a1c" strokeWidth="2.5" />
          <path
            d="M60 47.500l2.600 5.300 5.800.8-4.200 4.100 1 5.800-5.200-2.700-5.200 2.700 1-5.800-4.200-4.100 5.800-.8z"
            fill="#fff6d8"
          />
        </g>
      </svg>
    </div>
  );
}

/** The scholarship placard: its name, what is paid, and how. */
function AwardCard({ a, onClose }: { a: PriceAward; onClose: () => void }) {
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
        <h2 id="pz-pop-h">{a.name}</h2>
        <p className="pz-who">{a.sub}</p>
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
          <FoxWithMedal />
        </div>
      </div>
    </div>
  );
}

export default function PricingPage({ headline, sides, self, tutor, words, links }: PriceProps) {
  const [side, setSide] = useState<"self" | "tutor">("tutor");
  const [when, setWhen] = useState(0);
  const [term, setTerm] = useState<Record<string, number>>({});
  const [pop, setPop] = useState<PriceAward | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const plans = side === "self" ? self : tutor;
  const close = () => {
    setPop(null);
    opener.current?.focus();
  };

  const card = (p: PricePlan, i: number) => {
    const t = p.terms?.[term[p.id] ?? 0];
    const cohort = p.cohorts?.[Math.min(when, p.cohorts.length - 1)];
    return (
      <article
        className="pz-card"
        key={p.id}
        data-plan={p.id}
        data-best={p.best || undefined}
        style={{ "--i": i } as CSSProperties}
      >
        {p.award && cohort?.award ? (
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
              <i>{p.award.badgeSub}</i>
            </span>
          </button>
        ) : null}
        <div className="pz-head">
          {p.tag ? <p className="pz-tag">{p.tag}</p> : null}
          <h2>
            {p.name}
            {p.chip ? <em className="pz-chip">{p.chip}</em> : null}
          </h2>
          <p className="pz-line" data-sealed={p.sealed || undefined}>
            {p.sealed ? <Seal /> : null}
            {p.line}
          </p>
        </div>
        {p.terms ? (
          <div className="pz-term" role="radiogroup" aria-label={p.name}>
            {p.terms.map((x, k) => (
              <button
                key={x.label}
                type="button"
                role="radio"
                aria-checked={(term[p.id] ?? 0) === k}
                onClick={() => setTerm((m) => ({ ...m, [p.id]: k }))}
              >
                {x.label}
              </button>
            ))}
          </div>
        ) : null}
        <p className="pz-price" key={t?.label} aria-live="polite">
          <b className="num">{t?.price ?? p.price}</b>
          <span>{t?.unit ?? p.unit}</span>
          {(t?.note ?? p.note) ? <small>{t?.note ?? p.note}</small> : null}
        </p>
        {p.cohorts && cohort ? (
          <div className="pz-when">
            <span>{words.sat}</span>
            <div role="radiogroup" aria-label={words.sat}>
              {p.cohorts.map((c, k) => (
                <button
                  key={c.sat}
                  type="button"
                  role="radio"
                  aria-checked={c === cohort}
                  onClick={() => setWhen(k)}
                >
                  {c.sat}
                </button>
              ))}
            </div>
            <small aria-live="polite">
              {words.starts} {cohort.starts} · {words.closes} {cohort.closes}
            </small>
          </div>
        ) : null}
        <a className="btn pz-go" href={t?.href ?? p.href}>
          <span className="lb">{p.cta}</span>
          <span className="go">
            <Arrow />
          </span>
        </a>
        <ul className="pz-list">
          {p.bullets.map((x) => (
            <li key={x}>
              <Check />
              {x}
            </li>
          ))}
        </ul>
      </article>
    );
  };

  return (
    <section className="pg-hero pz" data-side={side} id="top">
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
        <div className="pz-cards" key={side} style={{ "--n": plans.length } as CSSProperties}>
          {plans.map(card)}
        </div>
        <p className="pz-foot">
          {side === "self" ? (
            <a href={links.free}>{words.freeNote}</a>
          ) : (
            <a href={links.guarantee}>{words.link}</a>
          )}
        </p>
      </div>
      {pop ? <AwardCard a={pop} onClose={close} /> : null}
    </section>
  );
}
