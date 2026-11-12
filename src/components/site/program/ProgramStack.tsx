"use client";

// The SAT Program page's opening (founder's pick, 2026-11-11: "the stack"): what one seat holds, as six
// layers dropped one on another, with the promise as the base. Centred, and deliberately not the home page's
// opening. He wants more work on it; the words are in site-copy.ts, section 21.
import { useEffect, useState } from "react";
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { pairs, section } from "@/lib/marketing/site-copy";

/** Whole days until registration closes; never below zero. The server's count is shown first. */
function useDaysLeft() {
  const count = () =>
    Math.max(0, Math.ceil((Date.parse(`${MP.enrollmentCloses}T23:59:59`) - Date.now()) / 864e5));
  const [days, setDays] = useState(count);
  useEffect(() => {
    setDays(count());
    const t = setInterval(() => setDays(count()), 60_000);
    return () => clearInterval(t);
  }, []);
  return days;
}

/** The two actions and the dates, the same under every option. */
function Close() {
  const s = section(21);
  const days = useDaysLeft();
  return (
    <div className="pg-close">
      <div className="go-row">
        <Btn label={s.button} href="#reserve" />
        <a className="more" href={ROUTES.pricing}>
          {s["second button"]}
          <Arrow />
        </a>
      </div>
      <p className="fine pg-dates">
        <span className="pg-days" suppressHydrationWarning>
          <b className="num">{days}</b> {s["days left"]}
        </span>
        <span>
          {s.closes}. {s.starts}
        </span>
      </p>
    </div>
  );
}

/* Small drawings, one per layer of the stack: seats, a mistake coming back, a timed test, a report, the
   portal, the promise. Ink line, one filled accent each. */
const ICONS = [
  <g key="seats">
    <circle className="f" cx="13" cy="15" r="5" />
    <circle cx="24" cy="15" r="5" />
    <circle cx="35" cy="15" r="5" />
    <circle cx="13" cy="31" r="5" />
    <circle cx="24" cy="31" r="5" />
    <circle cx="35" cy="31" r="5" />
  </g>,
  <g key="back">
    <rect x="8" y="9" width="22" height="28" rx="4" />
    <path d="M14 18l6 6m0-6l-6 6" />
    <path className="s" d="M34 14a13 13 0 0 1 0 20" />
    <path className="s" d="M30 31l4 4 4-5" />
  </g>,
  <g key="test">
    <circle cx="24" cy="27" r="14" />
    <path d="M24 13V8m-5 0h10" />
    <path className="s" d="M24 27V18" />
    <circle className="f" cx="24" cy="27" r="3" />
  </g>,
  <g key="report">
    <rect x="7" y="11" width="34" height="26" rx="5" />
    <path d="M8 14l16 12 16-12" />
    <circle className="f" cx="38" cy="12" r="5" />
  </g>,
  <g key="portal">
    <rect x="7" y="9" width="34" height="30" rx="5" />
    <path d="M7 18h34" />
    <rect className="f" x="13" y="24" width="9" height="9" rx="2" />
    <path d="M27 26h9m-9 6h6" />
  </g>,
  <g key="promise">
    <path d="M24 6l15 6v11c0 9-6 16-15 19C15 39 9 32 9 23V12z" />
    <path className="s" d="M16 24l6 6 11-12" />
  </g>,
];

export default function ProgramStack() {
  const s = section(21);
  const stack = pairs(s["stack"]);
  return (
    <section className="pg-hero" id="top">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in">
        <h1>{s.headline}</h1>
        <ol className="pg-stack">
          {stack.map(([title, line], i) => (
            <li key={title} style={{ "--i": i } as React.CSSProperties}>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                {ICONS[i]}
              </svg>
              <p>
                <b>{title}</b>
                <span>{line}</span>
              </p>
            </li>
          ))}
        </ol>
        <Close />
      </div>
    </section>
  );
}
