"use client";

// The research page's drawing: two memories over the weeks before the SAT. One is read once and fades. The
// other is recalled again and again, spread out: each recall lifts it back up and it fades more slowly after,
// until it barely fades at all. Both curves draw themselves on arrival; light pulses through the recalls in turn.
// On desktop a hairline follows the pointer across the weeks and both curves show where they stand there.
// Words from site-copy.ts (section 81).
import { useEffect, useRef, type CSSProperties } from "react";
import { section } from "@/lib/marketing/site-copy";

const W = 600,
  H = 300,
  X0 = 30,
  X1 = 580,
  Y0 = 40,
  Y1 = 250;
const DAYS = 42;
const RECALLS = [3, 9, 20]; // drawn positions only, in days; the page never states the gaps
const x = (d: number) => X0 + (d / DAYS) * (X1 - X0);
const y = (m: number) => Y1 - m * (Y1 - Y0);

/** memory (0..1) on day d: read once fades fast; each recall resets it and slows the fade */
function once(d: number) {
  return 0.12 + 0.88 * Math.exp(-d / 3.2);
}
function spaced(d: number) {
  let start = 0,
    tau = 3.2;
  for (const r of RECALLS) {
    if (d < r) break;
    start = r;
    tau *= 2.8;
  }
  return 0.12 + 0.88 * Math.exp(-(d - start) / tau);
}
const trace = (f: (d: number) => number) => {
  const pts: string[] = [];
  for (let d = 0; d <= DAYS; d += 0.25) {
    const atRecall = RECALLS.find((r) => d >= r && d - 0.25 < r);
    if (atRecall !== undefined && f === spaced)
      pts.push(`${x(atRecall).toFixed(1)},${y(f(atRecall - 0.001)).toFixed(1)}`);
    pts.push(`${x(d).toFixed(1)},${y(f(d)).toFixed(1)}`);
  }
  return "M" + pts.join("L");
};
const ONCE = trace(once);
const SPACED = trace(spaced);

export default function ResearchCurve() {
  const f = section(81);
  const host = useRef<HTMLDivElement>(null);
  const cur = useRef<SVGGElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          el.classList.add("drawn");
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function move(ev: React.PointerEvent<SVGSVGElement>) {
    if (ev.pointerType !== "mouse" || !cur.current) return;
    const b = ev.currentTarget.getBoundingClientRect();
    const sx = ((ev.clientX - b.left) / b.width) * W;
    const d = Math.min(DAYS, Math.max(0, ((sx - X0) / (X1 - X0)) * DAYS));
    const g = cur.current;
    g.style.opacity = "1";
    g.setAttribute("transform", `translate(${x(d).toFixed(1)} 0)`);
    g.querySelector(".c-a")?.setAttribute("cy", y(once(d)).toFixed(1));
    g.querySelector(".c-b")?.setAttribute("cy", y(spaced(d)).toFixed(1));
  }

  return (
    <div className="rc i-art rv" ref={host}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${f["curve once"]} fades within days. ${f["curve spaced"]} fades less after each recall.`}
        onPointerMove={move}
        onPointerLeave={() => cur.current && (cur.current.style.opacity = "0")}
      >
        <line className="rc-ax" x1={X0} x2={X1} y1={Y1 + 14} y2={Y1 + 14} />
        <line className="rc-ax" x1={X0 - 12} x2={X0 - 12} y1={Y0} y2={Y1} />
        <path d={ONCE} pathLength={1} className="rc-once" />
        <path d={SPACED} pathLength={1} className="rc-spaced" />
        {RECALLS.map((r, k) => (
          <circle
            key={r}
            cx={x(r)}
            cy={y(1)}
            r="6"
            className="rc-recall"
            style={{ "--k": k } as CSSProperties}
          />
        ))}
        <g ref={cur} className="rc-cur" style={{ opacity: 0 }}>
          <line x1="0" x2="0" y1={Y0 - 10} y2={Y1 + 14} />
          <circle className="c-a" cx="0" cy={y(1)} r="5" />
          <circle className="c-b" cx="0" cy={y(1)} r="6" />
        </g>
        <text x={x(DAYS) - 4} y={y(spaced(DAYS)) - 30} className="rc-t b" textAnchor="end">
          {f["curve spaced"]}
        </text>
        <text x={x(DAYS) - 4} y={y(once(DAYS)) - 16} className="rc-t a" textAnchor="end">
          {f["curve once"]}
        </text>
        <text x={X0 - 12} y={Y0 - 22} className="rc-t ax">
          {f["curve memory"]}
        </text>
        <text x={X1} y={Y1 + 44} className="rc-t ax" textAnchor="end">
          {f["curve time"]}
        </text>
      </svg>
    </div>
  );
}
