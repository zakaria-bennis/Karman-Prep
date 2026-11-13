"use client";

// TEMPORARY (2026-11-13): the opening of the SAT Program page and of the Private tutoring page, in the two
// designs the founder kept from six. A row of buttons at the bottom of the hero switches between them on the
// dev server only; everywhere else "Flock" shows.
//   Flock  the landscape comes forward: its mist parts, its birds fly out of the valley past the reader, and
//          the headline is blown in on their wings. One bird lands on the headline and stays. Click it and it
//          takes off, circles and lands again.
//   Live   a number that is true this second, under the headline: the countdown to enrollment closing on the
//          Program page, the reader's own clock on the Private page.
// Words arrive as props. Styles: hero-lab.css.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Arrow } from "@/components/site/parts";

const PICK = process.env.NODE_ENV !== "production";
const NAMES = ["Flock", "Live"] as const;

export interface HeroWords {
  clockLabel: string;
  clockLine: string;
}

const v = (o: Record<string, string | number>) => o as CSSProperties;

/** One bird, seen from the front, as the landscape draws them: two wings that beat and a small body. */
function Bird() {
  return (
    <svg viewBox="-32 -22 64 44" aria-hidden="true">
      <path className="hx-wl" d="M0 1C-7-9-17-13-30-7c9 0 17 3 24 9z" />
      <path className="hx-wr" d="M0 1C7-9 17-13 30-7c-9 0-17 3-24 9z" />
      <ellipse className="hx-body" cx="0" cy="3" rx="5.500" ry="4" />
      <path className="hx-beak" d="M-1.500 5.500L0 9l1.500-3.500z" />
    </svg>
  );
}

/** The bird that lands on the headline, seen from the side: it beats one wing as it comes in, then sits. */
function Perched() {
  return (
    <svg viewBox="-26 -22 52 40" aria-hidden="true">
      <path className="hx-tail" d="M-9 2l-15 5 3-9z" />
      <ellipse className="hx-body" cx="0" cy="2" rx="12" ry="8" />
      <circle className="hx-body" cx="11" cy="-6" r="6" />
      <path className="hx-beak" d="M16 -7l8 2-8 3z" />
      <circle className="hx-eye" cx="12.500" cy="-7.500" r="1.400" />
      <path className="hx-wing" d="M-8 0c2-12 12-14 18-8-3 8-10 12-18 8z" />
      <path className="hx-leg" d="M-2 9v7M4 9v7" />
    </svg>
  );
}

/** Where each bird leaves the screen (in viewport units from the valley's vanishing point), how large it has
 *  grown by then, and when it sets off. Worked out from the bird's number so nothing is random. */
const FLOCK = Array.from({ length: 9 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  return {
    x: side * (22 + ((i * 17) % 34)),
    y: -8 + ((i * 23) % 46) - (i % 3) * 10,
    s: 5 + ((i * 7) % 5),
    d: 0.25 + i * 0.16,
  };
});

/** The clock on the Private page: the reader's own time, ticking. */
function LiveClock({ label, line }: { label: string; line: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now
    ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
    : "0:00:00";
  return (
    <div className="hx-live">
      <small>{label}</small>
      <b className="num" suppressHydrationWarning>
        {time.toLowerCase()}
      </b>
      <p>{line}</p>
    </div>
  );
}

export default function HeroLab({
  page,
  headline,
  primary,
  secondary,
  w,
  live,
  children,
}: {
  page: "program" | "private";
  headline: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  w: HeroWords;
  /** "Live" on the Program page: the countdown to enrollment closing. */
  live?: ReactNode;
  /** Shown under the buttons (the Program page's promise switch). */
  children?: ReactNode;
}) {
  const [look, setLook] = useState<(typeof NAMES)[number]>("Flock");
  const [flight, setFlight] = useState(0);
  const root = useRef<HTMLElement>(null);
  const flock = look === "Flock";
  const words = headline.split(" ");

  return (
    <section
      className="pg-hero hx"
      data-hero={flock ? "flock" : "live"}
      data-page={page}
      id="top"
      ref={root}
      key={look}
    >
      <div className="mist" aria-hidden="true" />
      {flock ? (
        <>
          <div className="hx-veil" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="hx-flock" aria-hidden="true">
            {FLOCK.map((b, i) => (
              <span
                key={i}
                className="hx-bird"
                style={v({ "--x": `${b.x}vw`, "--y": `${b.y}vh`, "--s": b.s, "--d": `${b.d}s` })}
              >
                <Bird />
              </span>
            ))}
          </div>
        </>
      ) : null}
      <div className="pg-in">
        <div className="hx-say">
          <h1 aria-label={headline}>
            {words.map((word, i) => (
              <span
                key={`${word}${i}`}
                className="hx-w"
                aria-hidden="true"
                data-num={/\d/.test(word) || undefined}
                style={v({ "--i": i })}
              >
                {word}{" "}
              </span>
            ))}
            {flock ? (
              <button
                className="hx-perch"
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                key={flight}
                data-again={flight ? "" : undefined}
                onClick={() => setFlight((n) => n + 1)}
              >
                <Perched />
              </button>
            ) : null}
          </h1>
          {flock ? null : (live ?? <LiveClock label={w.clockLabel} line={w.clockLine} />)}
          <div className="hx-go">
            <a className="btn" href={primary.href}>
              <span className="lb">{primary.label}</span>
              <span className="go">
                <Arrow />
              </span>
            </a>
            <a className="more" href={secondary.href}>
              {secondary.label}
            </a>
          </div>
          {children}
        </div>
      </div>
      {PICK ? (
        <p className="hx-pick">
          {NAMES.map((name) => (
            <button key={name} type="button" aria-pressed={look === name} onClick={() => setLook(name)}>
              {name}
            </button>
          ))}
        </p>
      ) : null}
    </section>
  );
}
