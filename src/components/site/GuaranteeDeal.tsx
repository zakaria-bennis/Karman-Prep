"use client";

// The guarantee, drawn (2026-10-26). One hairline score line runs from the starting score through the weeks of
// work to SAT day, then splits into the three endings, each with what the family gets. It draws itself when it
// comes on screen, a dot walks it, and light pulses down all three endings together. Pointing at an ending (or
// tapping it) lights that one, sends the dot down it and reads it out; every ending is always written on the
// page, so nothing depends on the pointer. Under it, the two sides of the deal, ticked in turn. Every word comes from site-copy.ts (section 8; pricing passes its own headline and text).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { list, pairs, type CopySection } from "@/lib/marketing/site-copy";
import Photo from "./Photo";
import { Kinetic, TextLink } from "./parts";
import { ROUTES } from "./routes";

const MAIN = "M40 330 C120 332 150 300 220 298 S320 252 380 262 S480 214 540 218 S620 204 650 200";
// the three endings, top to bottom: the promise kept, half back, everything back
const ENDS = [
  "M650 200 C760 200 800 74 960 70",
  "M650 200 C760 200 820 200 960 200",
  "M650 200 C760 200 820 326 960 330",
];
const END_Y = [70, 200, 330];
const WEEKS = 9;

export default function GuaranteeDeal({ g, headId }: { g: CopySection; headId: string }) {
  const root = useRef<HTMLDivElement>(null);
  const main = useRef<SVGPathElement>(null);
  const ends = useRef<(SVGPathElement | null)[]>([]);
  const dot = useRef<SVGCircleElement>(null);
  const [pick, setPick] = useState(-1);
  const pickRef = useRef(-1);
  const outcomes = pairs(g.outcomes);
  const weDo = list(g["we do"]);
  const youDo = list(g["you do"]);
  const covers = list(g.covers);

  // draw on arrival, then let the dot walk the line
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t0 = 0;
    let route: SVGPathElement[] = [];
    const place = (p: SVGPathElement, k: number) => {
      const pt = p.getPointAtLength(p.getTotalLength() * k);
      dot.current?.setAttribute("cx", pt.x.toFixed(1));
      dot.current?.setAttribute("cy", pt.y.toFixed(1));
    };
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const walk = (paths: SVGPathElement[], ms: number) => {
      cancelAnimationFrame(raf);
      route = paths;
      t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        const span = ease(k) * route.length;
        const i = Math.min(route.length - 1, Math.floor(span));
        place(route[i], Math.min(1, span - i));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const go = (i: number) => {
      const m = main.current,
        e = ends.current[i];
      if (!m) return;
      if (reduce || i === -2) return place(e ?? m, 1);
      if (i < 0) walk([m], 2600);
      else if (e) walk([e], 900);
    };
    (el as HTMLDivElement & { kGo?: (i: number) => void }).kGo = go;
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0].isIntersecting) return;
        el.classList.add("drawn");
        if (main.current) place(main.current, 0);
        setTimeout(() => go(pickRef.current), reduce ? 0 : 500);
        io.disconnect();
      },
      { threshold: 0.3 }
    );
    // watch the line itself: the whole section is taller than a phone's screen
    io.observe(el.querySelector(".gx-board") ?? el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  function choose(i: number) {
    if (i === pickRef.current) return;
    pickRef.current = i;
    setPick(i);
    const el = root.current as (HTMLDivElement & { kGo?: (i: number) => void }) | null;
    if (el?.classList.contains("drawn")) el.kGo?.(i < 0 ? -2 : i);
  }

  // the stage leans a few px toward the pointer, so the drawing feels held, not printed
  function lean(ev: React.PointerEvent<HTMLDivElement>) {
    if (ev.pointerType !== "mouse") return;
    const b = ev.currentTarget.getBoundingClientRect();
    const x = (ev.clientX - b.left) / b.width - 0.5,
      y = (ev.clientY - b.top) / b.height - 0.5;
    ev.currentTarget.style.setProperty("--lx", `${(x * 10).toFixed(1)}px`);
    ev.currentTarget.style.setProperty("--ly", `${(y * 8).toFixed(1)}px`);
    // the ending nearest the pointer, once it is past the split
    const svgX = (ev.clientX - b.left) / b.width;
    if (svgX > 0.5) {
      const sy = ((ev.clientY - b.top) / b.height) * 400;
      let best = 0;
      END_Y.forEach((y0, k) => Math.abs(sy - y0) < Math.abs(sy - END_Y[best]) && (best = k));
      choose(best);
    }
  }

  return (
    <div className="gx" ref={root} data-pick={pick}>
      <div className="gx-head">
        {g.eyebrow ? <p className="eyebrow rv">{g.eyebrow}</p> : null}
        {g.headline ? (
          <h2 className="rv kin" id={headId}>
            <Kinetic text={g.headline} />
          </h2>
        ) : null}
        {g.text ? <p className="lede rv">{g.text}</p> : null}
      </div>

      <div className="gx-board">
        <Photo name="start" className="gx-ph start" />
        <div
          className="gx-stage"
          onPointerMove={lean}
          onPointerLeave={(e) => {
            e.currentTarget.style.setProperty("--lx", "0px");
            e.currentTarget.style.setProperty("--ly", "0px");
            choose(-1);
          }}
        >
          <svg viewBox="0 0 1000 400" aria-hidden="true" className="gx-svg">
            {Array.from({ length: WEEKS + 1 }, (_, k) => {
              const x = 40 + (k * 610) / WEEKS;
              return (
                <line
                  key={k}
                  className="gx-wk"
                  x1={x}
                  x2={x}
                  y1={376}
                  y2={k === 0 || k === WEEKS ? 360 : 368}
                  style={{ "--k": k } as CSSProperties}
                />
              );
            })}
            <line className="gx-axis" x1="40" x2="960" y1="376" y2="376" />
            <line className="gx-target" x1="470" x2="960" y1="132" y2="132" />
            <path ref={main} d={MAIN} pathLength={1} className="gx-main" />
            {ENDS.map((d, k) => (
              <g key={k} className={`gx-end e${k} ${pick === k ? "on" : ""}`}>
                <path
                  ref={(n) => {
                    ends.current[k] = n;
                  }}
                  d={d}
                  pathLength={1}
                  className="gx-branch"
                  style={{ "--k": k } as CSSProperties}
                />
                <path d={d} pathLength={1} className="gx-pulse" />
                <circle cx="960" cy={END_Y[k]} r="7" className="gx-node" />
              </g>
            ))}
            <circle cx="40" cy="330" r="7" className="gx-node start" />
            <circle cx="650" cy="200" r="5" className="gx-node split" />
            <circle ref={dot} cx="40" cy="330" r="9" className="gx-dot" />
          </svg>
          <p className="gx-lab s">{g["line start"]}</p>
          <p className="gx-lab w">{g["line weeks"]}</p>
          <p className="gx-lab d">{g["line end"]}</p>
          <p className="gx-lab t">{g.promise}</p>
        </div>
        <ol className="gx-ends" onPointerLeave={() => choose(-1)}>
          {outcomes.map(([r, w], k) => (
            <li
              key={r}
              className={`e${k} ${pick === k ? "on" : ""}`}
              style={{ "--y": `${(END_Y[k] / 400) * 100}%` } as CSSProperties}
              onPointerEnter={() => choose(k)}
            >
              <button
                type="button"
                onClick={() => choose(pick === k ? -1 : k)}
                aria-pressed={pick === k}
              >
                <b>{r}</b>
                <span>{w}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="gx-promise rv">
        <p className="big">{g.promise}</p>
        {g["promise note"] ? <p className="note">{g["promise note"]}</p> : null}
      </div>

      <div className="gx-deal">
        <Side title={g["we do title"]} items={weDo} cls="we" />
        <Side title={g["you do title"]} items={youDo} cls="you" />
      </div>

      <div className="gx-foot rv">
        <div>
          {covers.length ? (
            <ul className="gx-covers">
              {covers.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}
          {g.claim ? <p className="claim">{g.claim}</p> : null}
          {g.link ? <TextLink label={g.link} href={ROUTES.guarantee} /> : null}
        </div>
      </div>
    </div>
  );
}

/** One side of the deal: a title and its lines, each with a tick that draws in its turn. The two sides take
 *  turns (ours, theirs, ours...), like an exchange. */
function Side({ title, items, cls }: { title?: string; items: string[]; cls: string }) {
  if (!items.length) return null;
  return (
    <div className={`gx-side ${cls} rv`}>
      <h3>{title}</h3>
      <ul>
        {items.map((x, k) => (
          <li key={x} style={{ "--k": k * 2 + (cls === "you" ? 1 : 0) } as CSSProperties}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10.5 8.2 14.5 16 5.5" pathLength={1} />
            </svg>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
