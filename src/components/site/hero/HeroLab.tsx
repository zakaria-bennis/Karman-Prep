"use client";

// TEMPORARY (2026-11-13): the opening of the SAT Program page and of the Private tutoring page in six
// designs, for the founder to choose from. A row of buttons at the bottom of the hero switches between them
// on the dev server only; everywhere else design 1 shows. Each idea comes from a hero found on Mobbin:
//   1 Orbit     pieces of the product float round the headline and drift with the pointer (Uxcel)
//   2 Fox       the fox sits inside the headline, blinks and watches the pointer (Phantom)
//   3 Oversize  large drawn things tumble in and overlap the headline (Gumroad)
//   4 Live      a number that is true this second, under the headline (Fresha)
//   5 Demo      the product itself is the hero (Partiful)
//   6 Sky       the landscape performs: a paper plane crosses and the headline arrives in its trail
// Words arrive as props (site-copy.ts section 59 and the page's own opening). Styles: hero-lab.css.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Fox } from "@/components/portal/Fox";
import { Arrow } from "@/components/site/parts";

const PICK = process.env.NODE_ENV !== "production";
const NAMES = ["Orbit", "Fox", "Oversize", "Live", "Demo", "Sky"];

export interface HeroWords {
  /** "…{fox}…": where the fox sits in the headline. */
  foxHeadline: string;
  /** The floating pieces' words, by name. */
  pieces: Record<string, string>;
  sheets: string[];
  sheetWord: string;
  sheetsNote: string;
  clockLabel: string;
  clockLine: string;
}

const v = (o: Record<string, string | number>) => o as CSSProperties;

function Words({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span
          key={`${word}${i}`}
          className="hx-w"
          aria-hidden="true"
          data-num={/\d/.test(word) || undefined}
          style={v({ "--i": from + i })}
        >
          {word}{" "}
        </span>
      ))}
    </>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

/** A score that counts up, over a small line that climbs unevenly. */
function ScorePiece({ label, from, to }: { label: string; from: string; to: string }) {
  const [n, setN] = useState(Number(from));
  useEffect(() => {
    const a = Number(from);
    const b = Number(to);
    let raf = 0;
    const t0 = performance.now() + 900;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / 1800));
      setN(Math.round((a + (b - a) * (1 - Math.pow(1 - p, 3))) / 10) * 10);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return (
    <div className="hx-p hx-score">
      <small>{label}</small>
      <b className="num">{n}</b>
      <svg viewBox="0 0 120 40" aria-hidden="true">
        <path d="M4 34l14-5 14 3 14-9 14-2 14 4 14-10 14-3 14-7" />
      </svg>
      <em>
        +{Number(to) - Number(from)}
      </em>
    </div>
  );
}

/** Design 1: what floats round the headline. */
function Orbit({ page, p }: { page: "program" | "private"; p: Record<string, string> }) {
  const pieces: ReactNode[] =
    page === "program"
      ? [
          <ScorePiece key="s" label={p["score label"]} from={p["score from"]} to={p["score to"]} />,
          <div key="t" className="hx-p hx-sheet">
            <small>{p.sheet}</small>
            <i>
              {Array.from({ length: 12 }, (_, i) => (
                <u key={i} data-on={[0, 1, 3, 4, 5, 7, 8, 10, 11].includes(i) || undefined} />
              ))}
            </i>
            <b className="num">{p["sheet score"]}</b>
          </div>,
          <div key="c" className="hx-p hx-class">
            <i>
              {["A", "J", "M", "S", "D", "L"].map((x, i) => (
                <u key={x} style={v({ "--n": i })}>
                  {x}
                </u>
              ))}
            </i>
            <b>{p.class}</b>
            <small>{p["class sub"]}</small>
          </div>,
          <div key="l" className="hx-p hx-chip">
            <span className="hx-dot" />
            <b>{p.live}</b>
            <small>{p["live sub"]}</small>
          </div>,
          <div key="r" className="hx-p hx-chip hx-report">
            <Check />
            <b>{p.report}</b>
            <small>{p["report sub"]}</small>
          </div>,
        ]
      : [
          <div key="b" className="hx-p hx-chip hx-booked">
            <Check />
            <b>{p.booked}</b>
            <small>{p["booked sub"]}</small>
          </div>,
          <div key="t" className="hx-p hx-text">
            <small>{p["text from"]}</small>
            <b>{p.text}</b>
          </div>,
          <div key="d" className="hx-p hx-day">
            <small>{p["day top"]}</small>
            <b className="num">{p.day}</b>
          </div>,
          <ScorePiece key="s" label={p["score label"]} from={p["score from"]} to={p["score to"]} />,
          <div key="r" className="hx-p hx-chip hx-recap">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="10" />
              <path d="M8 6l6 4-6 4z" className="hx-play" />
            </svg>
            <b>{p.recap}</b>
            <small>{p["recap sub"]}</small>
          </div>,
        ];
  return (
    <div className="hx-orbit" aria-hidden="true">
      {pieces.map((piece, i) => (
        <div key={i} className="hx-o" style={v({ "--n": i })}>
          {piece}
        </div>
      ))}
    </div>
  );
}

/** Design 3: large drawn things that tumble in. The program's nine tests fan out; private gets a calendar
 *  page, a clock that runs and a message being typed. */
function Oversize({ page, w }: { page: "program" | "private"; w: HeroWords }) {
  if (page === "program")
    return (
      <div className="hx-fan" aria-hidden="true">
        {w.sheets.map((score, i) => (
          <div key={i} className="hx-leaf" style={v({ "--n": i, "--k": i - (w.sheets.length - 1) / 2 })}>
            <small>
              {w.sheetWord} {i + 1}
            </small>
            <b className="num">{score}</b>
            <i>
              {Array.from({ length: 10 }, (_, k) => (
                <u key={k} data-on={(k * 7 + i * 3) % 4 !== 0 || undefined} />
              ))}
            </i>
          </div>
        ))}
        <p>{w.sheetsNote}</p>
      </div>
    );
  return (
    <div className="hx-big" aria-hidden="true">
      <div className="hx-cal">
        <small>{w.pieces["day top"]}</small>
        <b className="num">{w.pieces.day}</b>
        <i>
          {Array.from({ length: 6 }, (_, k) => (
            <u key={k} data-on={k === 3 || undefined} />
          ))}
        </i>
      </div>
      <svg className="hx-clock" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" className="hx-face" />
        {Array.from({ length: 12 }, (_, k) => (
          <path key={k} d="M60 12v8" transform={`rotate(${k * 30} 60 60)`} className="hx-mark" />
        ))}
        <path d="M60 60V30" className="hx-hand hx-min" />
        <path d="M60 60h20" className="hx-hand hx-hour" />
        <circle cx="60" cy="60" r="5" className="hx-pin" />
      </svg>
      <div className="hx-bubble">
        <small>{w.pieces["text from"]}</small>
        <b>{w.pieces.text}</b>
        <i>
          <u />
          <u />
          <u />
        </i>
      </div>
    </div>
  );
}

/** Design 4, on the Private page: the visitor's own time, ticking. */
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

/** Design 6: a paper plane crosses the valley; the headline arrives in its trail. */
function Sky() {
  const path = "M-80 440C170 400 290 130 640 128s560 90 900-80";
  return (
    <svg className="hx-sky" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d={path} className="hx-trail" pathLength={1} />
      <g className="hx-plane">
        <path d="M-22 -9L24 0-22 9-13 0z" className="hx-wing" />
        <path d="M-13 0L24 0-22 9z" className="hx-fold" />
        <animateMotion dur="3.4s" begin="0.35s" fill="freeze" rotate="auto" path={path} calcMode="spline" keyTimes="0;1" keySplines=".4 0 .3 1" />
      </g>
    </svg>
  );
}

export default function HeroLab({
  page,
  headline,
  primary,
  secondary,
  w,
  live,
  demo,
  children,
}: {
  page: "program" | "private";
  headline: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  w: HeroWords;
  /** Design 4 on the Program page: the countdown to enrollment closing. */
  live?: ReactNode;
  /** Design 5: the product piece that stands in as the hero. */
  demo: ReactNode;
  /** Shown under the buttons in every design (the Program page's promise switch). */
  children?: ReactNode;
}) {
  const [n, setN] = useState(1);
  const [hop, setHop] = useState(0);
  const root = useRef<HTMLElement>(null);

  // the pointer's place in the hero, from -1 to 1, for the pieces that drift and the fox's eyes
  useEffect(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", String(((e.clientX - r.left) / r.width) * 2 - 1));
      el.style.setProperty("--my", String(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);

  const [before, after] = w.foxHeadline.split("{fox}").map((x) => x.trim());
  const title =
    n === 2 ? (
      <h1 aria-label={headline}>
        <Words text={before} />
        <button
          className="hx-fox"
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          data-hop={hop ? (hop % 2 ? 1 : 2) : undefined}
          onClick={() => setHop((x) => x + 1)}
        >
          <Fox size={96} />
        </button>{" "}
        <Words text={after} from={before.split(" ").length + 2} />
      </h1>
    ) : (
      <h1 aria-label={headline}>
        <Words text={headline} />
      </h1>
    );

  return (
    <section className="pg-hero hx" data-hero={n} data-page={page} id="top" ref={root} key={n}>
      <div className="mist" aria-hidden="true" />
      {n === 6 ? <Sky /> : null}
      {n === 1 ? <Orbit page={page} p={w.pieces} /> : null}
      {n === 3 ? <Oversize page={page} w={w} /> : null}
      <div className={`pg-in${n === 5 ? " pg-two" : ""}`}>
        <div className="hx-say">
          {title}
          {n === 4 ? (live ?? <LiveClock label={w.clockLabel} line={w.clockLine} />) : null}
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
          {n === 3 || n === 5 ? null : children}
        </div>
        {n === 5 ? <div className="hx-demo">{demo}</div> : null}
      </div>
      {PICK ? (
        <p className="hx-pick">
          {NAMES.map((name, i) => (
            <button key={name} type="button" aria-pressed={n === i + 1} onClick={() => setN(i + 1)}>
              {i + 1} {name}
            </button>
          ))}
        </p>
      ) : null}
    </section>
  );
}
