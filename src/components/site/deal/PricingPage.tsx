"use client";

// The Pricing page: one headline, one switch (self-study or with a tutor), the plans on that side as
// frosted glass cards, each in its own colour, and a link to the guarantee. The cards drop into place.
//   A plan with a guarantee shows it at the top of the card, beside a shield.
//   Self-study plans carry one sliding pill in the top corner: 3 months (the default) or Monthly.
//   Private 20's saving is a ribbon that is pulled across its corner.
//   The cohort card holds the choice of SAT (each cohort ends on one) and the scholarship badge. Pressing
//   the badge dims the page and opens a small placard about the scholarship; it closes on a click anywhere,
//   its X, or Escape. Tapping the fox in it sets off a small celebration instead.
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

function Shield() {
  return (
    <svg className="pz-shield" viewBox="0 0 20 22" aria-hidden="true">
      <defs>
        <linearGradient id="pz-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor="#c9d1de" />
          <stop offset=".55" stopColor="#eef2f8" />
          <stop offset="1" stopColor="#9aa6b8" />
        </linearGradient>
        <clipPath id="pz-shield-clip">
          <path d="M10 1l8 3v6.400c0 5-3.400 8.800-8 10.600-4.600-1.800-8-5.600-8-10.600V4z" />
        </clipPath>
      </defs>
      <path
        className="pz-shield-body"
        d="M10 1l8 3v6.400c0 5-3.400 8.800-8 10.600-4.600-1.800-8-5.600-8-10.600V4z"
      />
      <g clipPath="url(#pz-shield-clip)">
        <path className="pz-shield-glint" d="M6 -2h4L4 24H0z" />
      </g>
    </svg>
  );
}

function Medal() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 1.5h8l-2.2 6H8.2z" opacity=".55" />
      <circle cx="10" cy="12.5" r="5.5" />
      <path
        d="M10 9.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.400 2-.3z"
        className="pz-star"
      />
    </svg>
  );
}

/** The fox's head with the medal hanging under its chin. Tapping it sets off a little party. */
function FoxWithMedal() {
  const [party, setParty] = useState(0);
  return (
    <button
      className="pz-foxy"
      type="button"
      tabIndex={-1}
      data-party={party ? party % 2 || 2 : undefined}
      onClick={(e) => {
        e.stopPropagation();
        setParty((n) => n + 1);
      }}
    >
      <Confetti key={party} />
      <span className="fxc">
        <Fox size={104} />
      </span>
      <svg className="pz-medal" viewBox="0 0 60 50" aria-hidden="true">
        <path d="M17 0h11l6 20H24z" fill="#2449b8" />
        <path d="M43 0H32l-6 20h10z" fill="#1a37a0" />
        <g className="pz-gold">
          <circle cx="30" cy="32" r="15" fill="#f0c25c" stroke="#b98a1c" strokeWidth="2.5" />
          <path
            d="M30 22.500l3 6 6.600.9-4.800 4.700 1.200 6.600-6-3.100-6 3.100 1.200-6.600-4.800-4.700 6.600-.9z"
            fill="#fff6d8"
          />
        </g>
      </svg>
    </button>
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
        <div className="pz-fox">
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
    const picked = term[p.id] ?? 0;
    const t = p.terms?.[picked];
    const cohort = p.cohorts?.[Math.min(when, p.cohorts.length - 1)];
    return (
      <article
        className="pz-card"
        key={p.id}
        data-plan={p.id}
        data-best={p.best || undefined}
        style={{ "--i": i } as CSSProperties}
      >
        {p.ribbon ? (
          <em className="pl-rib">
            <span>{p.ribbon}</span>
          </em>
        ) : null}
        {p.terms ? (
          <div className="pz-term" role="radiogroup" aria-label={p.name} data-on={picked}>
            <i aria-hidden="true" />
            {p.terms.map((x, k) => (
              <button
                key={x.label}
                type="button"
                role="radio"
                aria-checked={picked === k}
                onClick={() => setTerm((m) => ({ ...m, [p.id]: k }))}
              >
                {x.label}
              </button>
            ))}
          </div>
        ) : null}
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
        {p.promise ? (
          <p className="pz-promise">
            <Shield />
            {p.promise}
          </p>
        ) : null}
        <div className="pz-head">
          {p.tag ? <p className="pz-tag">{p.tag}</p> : null}
          <h2>{p.name}</h2>
        </div>
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
          {side === "tutor" ? <a href={links.guarantee}>{words.link}</a> : null}
        </p>
      </div>
      {pop ? <AwardCard a={pop} onClose={close} /> : null}
    </section>
  );
}
