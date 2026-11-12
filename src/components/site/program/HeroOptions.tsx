"use client";

// TEMPORARY (2026-11-11): three openings for the SAT Program page, for the founder to choose between. A
// small panel at the bottom of the screen switches them, on the development server only; a live build shows
// option A and no panel. When he picks, the chosen one moves to its own file and this file, the panel and
// the other two options' styles (program.css, .pg-b / .pg-c / .pg-pick) and words (site-copy.ts, section
// 21, keys starting "b " or "c ") are deleted.
import { useEffect, useState } from "react";
import ClaimPill from "@/components/site/home/ClaimPill";
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, GUARANTEE as G, MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";

const OPTIONS = ["a", "b", "c"] as const;
type Option = (typeof OPTIONS)[number];
const NAMES: Record<Option, string> = {
  a: "A. The promise",
  b: "B. The ticket",
  c: "C. Their number",
};

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

function Dates() {
  const s = section(21);
  const days = useDaysLeft();
  return (
    <p className="fine pg-dates">
      <span className="pg-days" suppressHydrationWarning>
        <b className="num">{days}</b> {s["days left"]}
      </span>
      <span>
        {s.closes}. {s.starts}
      </span>
    </p>
  );
}

function Actions() {
  const s = section(21);
  return (
    <div className="go-row">
      <Btn label={s.button} href="#reserve" />
      <a className="more" href={ROUTES.guarantee}>
        {s["second button"]}
        <Arrow />
      </a>
    </div>
  );
}

function OptionA() {
  const s = section(21);
  return (
    <div className="say">
      <h1>
        {s["a before"]}{" "}
        <span className="keep">
          <ClaimPill>{s["a pill"]}</ClaimPill>,
        </span>{" "}
        {s["a after"]}
      </h1>
      <p className="lede">{s["a lede"]}</p>
      <Actions />
      <Dates />
    </div>
  );
}

function OptionB() {
  const s = section(21);
  const days = useDaysLeft();
  return (
    <div className="say">
      <h1>{s["b headline"]}</h1>
      <div className="pg-ticket">
        <div className="pg-main">
          <p className="pg-name">{s["b ticket"]}</p>
          <dl>
            {pairs(s["b rows"]).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="pg-stub">
          <p className="pg-price">
            <b className="num">{formatPrice(MP.price)}</b>
            <span>{s["b price note"]}</span>
          </p>
          <Btn label={s.button} href="#reserve" />
          <p className="pg-left" suppressHydrationWarning>
            <b className="num">{days}</b> {s["days left"]}
          </p>
        </div>
      </div>
    </div>
  );
}

function OptionC() {
  const s = section(21);
  const bands = list(s["c bands"]);
  const [at, setAt] = useState(0);
  const gain = G.bands[at]?.cohort ?? null;
  return (
    <div className="say">
      <h1>{s["c headline"]}</h1>
      <div className="pg-ask">
        <p id="pg-ask">{s["c ask"]}</p>
        <div
          className="pg-seg"
          role="radiogroup"
          aria-labelledby="pg-ask"
          style={{ "--n": bands.length, "--at": at } as React.CSSProperties}
        >
          {bands.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={i === at}
              onClick={() => setAt(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="pg-promise" aria-live="polite">
        {gain === null ? (
          <>
            <b key="none">{s["c none title"]}</b>
            <span>{s["c none"]}</span>
          </>
        ) : (
          <>
            <b key={gain} className="num">
              +{gain}
            </b>
            <span>{s["c promise"]}</span>
          </>
        )}
      </p>
      <Actions />
      <Dates />
    </div>
  );
}

export default function HeroOptions() {
  const dev = process.env.NODE_ENV !== "production";
  const [pick, setPick] = useState<Option>("a");
  useEffect(() => {
    if (!dev) return;
    const asked = new URLSearchParams(location.search).get("hero") as Option | null;
    if (asked && OPTIONS.includes(asked)) setPick(asked);
  }, [dev]);
  return (
    <section className={`claim pg-hero pg-${pick}`} id="top">
      <div className="mist" aria-hidden="true" />
      {pick === "a" ? <OptionA /> : pick === "b" ? <OptionB /> : <OptionC />}
      {dev ? (
        <div className="pg-pick" role="group" aria-label="Opening options">
          {OPTIONS.map((o) => (
            <button key={o} type="button" aria-pressed={o === pick} onClick={() => setPick(o)}>
              {NAMES[o]}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
