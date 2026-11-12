"use client";

// TEMPORARY (2026-11-11): three openings for the SAT Program page, for the founder to choose between. A
// small panel at the bottom of the screen switches them, on the development server only; a live build shows
// option D and no panel. When he picks, the chosen one moves to its own file and this file, the panel and
// the other options' styles (program.css) and words (site-copy.ts, section 21, keys starting "d ", "e " or
// "f ") are deleted. None of them copies the home page's opening (his request): each is centred and built
// around one picture of what the cohort is.
import { useEffect, useState } from "react";
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";

const OPTIONS = ["d", "e", "f"] as const;
type Option = (typeof OPTIONS)[number];
const NAMES: Record<Option, string> = {
  d: "D. The stack",
  e: "E. Two sides",
  f: "F. The week",
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

function OptionD() {
  const s = section(21);
  const stack = pairs(s["d stack"]);
  return (
    <>
      <h1>{s["d headline"]}</h1>
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
    </>
  );
}

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

function OptionE() {
  const s = section(21);
  const today = list(s["e today"]);
  const report = list(s["e report"]);
  const [side, setSide] = useState(0);
  return (
    <>
      <h1>{s["e headline"]}</h1>
      <div
        className="pg-flip"
        role="group"
        aria-label={s["e headline"]}
        style={{ "--at": side } as React.CSSProperties}
      >
        {[s["e student title"], s["e parent title"]].map((t, i) => (
          <button key={t} type="button" aria-pressed={i === side} onClick={() => setSide(i)}>
            {t}
          </button>
        ))}
      </div>
      <div className="pg-sides" data-side={side}>
        <article className="pg-side pg-kid">
          <h2>{s["e student title"]}</h2>
          <ul>
            {list(s["e student"]).map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
          </ul>
          <div className="pg-card" aria-hidden="true">
            <b>{today[0]}</b>
            {today.slice(1).map((x, i) => (
              <span key={x} style={{ "--i": i } as React.CSSProperties}>
                <i />
                {x}
              </span>
            ))}
          </div>
        </article>
        <article className="pg-side pg-you">
          <h2>{s["e parent title"]}</h2>
          <ul>
            {list(s["e parent"]).map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
          </ul>
          <div className="pg-card pg-mail" aria-hidden="true">
            <b>
              {report[0]} <em>{s["e sample"]}</em>
            </b>
            <span style={{ "--i": 0 } as React.CSSProperties}>
              <i />
              {report[1]}
            </span>
            <span style={{ "--i": 1 } as React.CSSProperties}>
              <i />
              {report[2]}
            </span>
            <span className="pg-score" style={{ "--i": 2 } as React.CSSProperties}>
              {report[3]}
              <svg viewBox="0 0 120 34" preserveAspectRatio="none">
                <path d="M2 30C22 28 30 22 46 21s22-7 36-9 24-6 36-9" />
              </svg>
            </span>
            <span className="pg-note" style={{ "--i": 3 } as React.CSSProperties}>
              {report[4]}
              <u />
              <u />
            </span>
          </div>
        </article>
      </div>
      <Close />
    </>
  );
}

function OptionF() {
  const s = section(21);
  const days = list(s["f days"]);
  const lanes = list(s["f lanes"]);
  const blocks = list(s["f blocks"]);
  /* which day each live block sits on: two classes and the weekly workshop */
  const LIVE = [1, 3, 5];
  const legend = pairs(section(22).rows);
  return (
    <>
      <h1>{s["f headline"]}</h1>
      <div className="pg-week">
        <div
          className="pg-board"
          role="img"
          aria-label={legend.map(([k, v]) => `${k}: ${v}`).join(". ")}
        >
          <span className="pg-now" aria-hidden="true" />
          <div className="pg-row pg-head" aria-hidden="true">
            <span />
            {days.map((d, i) => (
              <b key={d} style={{ "--c": i } as React.CSSProperties}>
                {d}
              </b>
            ))}
          </div>
          <div className="pg-row pg-live" aria-hidden="true">
            <span>{lanes[0]}</span>
            {days.map((d, i) => {
              const at = LIVE.indexOf(i);
              return at < 0 ? (
                <i key={d} />
              ) : (
                <em
                  key={d}
                  data-kind={at === 2 ? "shop" : "class"}
                  style={{ "--c": i } as React.CSSProperties}
                >
                  {blocks[at]}
                </em>
              );
            })}
          </div>
          <div className="pg-row pg-ten" aria-hidden="true">
            <span>{lanes[1]}</span>
            {days.map((d, i) => (
              <em key={d} style={{ "--c": i } as React.CSSProperties}>
                <svg viewBox="0 0 20 20">
                  <path d="M5.5 10.5l3 3 6-7" />
                </svg>
              </em>
            ))}
          </div>
          <div className="pg-row pg-post" aria-hidden="true">
            <span>{lanes[2]}</span>
            {days.map((d, i) => (
              <em key={d} style={{ "--c": i } as React.CSSProperties}>
                <svg viewBox="0 0 24 18">
                  <rect x="1.5" y="1.5" width="21" height="15" rx="3" />
                  <path d="M2 3l10 7 10-7" />
                </svg>
              </em>
            ))}
          </div>
        </div>
        <ul className="pg-legend">
          {legend.map(([k, v]) => (
            <li key={k}>
              <b>{k}</b>
              <span>{v}</span>
            </li>
          ))}
        </ul>
        <p className="pg-small">{s["f note"]}</p>
      </div>
      <Close />
    </>
  );
}

export default function HeroOptions() {
  const dev = process.env.NODE_ENV !== "production";
  const [pick, setPick] = useState<Option>("d");
  useEffect(() => {
    if (!dev) return;
    const asked = new URLSearchParams(location.search).get("hero") as Option | null;
    if (asked && OPTIONS.includes(asked)) setPick(asked);
  }, [dev]);
  return (
    <section className={`pg-hero pg-${pick}`} id="top">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in">
        {pick === "d" ? <OptionD /> : pick === "e" ? <OptionE /> : <OptionF />}
      </div>
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
