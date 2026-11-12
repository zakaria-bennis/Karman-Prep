"use client";

// The nine weeks as a score climb. A line rises from the starting score to the promised one through one
// point per weekly test; a marker travels along it with the score counting up beside it, and each test's
// point lights as the marker passes. It plays when it comes on screen and again every so often. Under
// reduced motion, or when the painting is held still, it is simply drawn in full. Props carry the numbers
// and words, so the site's facts stay on the server.
import { useEffect, useRef, useState } from "react";

const W = 640;
const H = 400;
const X0 = 58;
const X1 = 596;
const Y0 = 318;
const Y1 = 84;
const RUN_MS = 5200;
const REST_MS = 4200;

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");

export default function ScoreClimb({
  start,
  gain,
  weeks,
  words,
}: {
  start: number;
  gain: number;
  weeks: number;
  words: { start: string; goal: string; test: string; note: string };
}) {
  const host = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const [t, setT] = useState(1);
  /* the plan's shape: slow at first, then steady, landing on the promise */
  const gains = Array.from({ length: weeks + 1 }, (_, i) => gain * (i / weeks) ** 1.15);
  const step = (X1 - X0) / weeks;
  const pts = gains.map((g, i) => [X0 + i * step, Y0 - (g / gain) * (Y0 - Y1)] as const);
  const d = pts
    .map(([x, y], i) =>
      i
        ? `C${(x - step * 0.5).toFixed(1)} ${pts[i - 1][1].toFixed(1)} ${(x - step * 0.45).toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
        : `M${x} ${y}`
    )
    .join("");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let raf = 0;
    let t0 = 0;
    let seen = false;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!seen || document.hidden) return;
      if (still()) return setT(1);
      if (!t0) t0 = now;
      const run = (now - t0) % (RUN_MS + REST_MS);
      const p = Math.min(1, run / RUN_MS);
      setT(p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen) t0 = 0;
        seen = e.isIntersecting;
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  /* where the marker is: by the path's own length, so it sits exactly on the line */
  const [at, setAt] = useState<[number, number]>([X1, Y1]);
  useEffect(() => {
    const p = path.current;
    if (!p) return;
    const pt = p.getPointAtLength(p.getTotalLength() * t);
    setAt([pt.x, pt.y]);
  }, [t]);
  const reached = (at[0] - X0) / (X1 - X0);
  /* how many of the weekly tests the marker has passed */
  const passed = Math.floor(reached * weeks + 0.02);
  const score = Math.round((start + ((Y0 - at[1]) / (Y0 - Y1)) * gain) / 10) * 10;
  return (
    <figure className="sc" ref={host}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={words.note}>
        <defs>
          <linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--a)" stopOpacity=".34" />
            <stop offset="1" stopColor="var(--a)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="sc-clip">
            <rect x="0" y="0" width={at[0]} height={H} />
          </clipPath>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <path className="g" d={`M${X0} ${Y0 - f * (Y0 - Y1)}H${X1}`} />
            <text className="y" x={X0 - 12} y={Y0 - f * (Y0 - Y1) + 5} textAnchor="end">
              {start + f * gain}
            </text>
          </g>
        ))}
        <path className="ghost" d={d} />
        <g clipPath="url(#sc-clip)">
          <path className="a" d={`${d}L${X1} ${Y0}L${X0} ${Y0}Z`} fill="url(#sc-fill)" />
          <path className="l" d={d} ref={path} />
        </g>
        {pts.slice(1).map(([x, y], i) => {
          const lit = reached >= (i + 1) / weeks - 0.01;
          return (
            <g key={i} className="t" data-lit={lit || undefined}>
              <path className="drop" d={`M${x} ${y + 12}V${Y0}`} />
              <circle cx={x} cy={y} r={i === weeks - 1 ? 9 : 6.5} />
              <text x={x} y={Y0 + 26} textAnchor="middle">
                {i + 1}
              </text>
            </g>
          );
        })}
        <text className="k" x={X0} y={Y0 + 26} textAnchor="middle">
          {words.test}
        </text>
        <circle className="halo" cx={at[0]} cy={at[1]} r="15" />
        <circle className="now" cx={at[0]} cy={at[1]} r="7.5" />
      </svg>
      <span
        className="sc-chip"
        style={{ left: `${(at[0] / W) * 100}%`, top: `${(at[1] / H) * 100}%` }}
        data-end={t > 0.985 || undefined}
      >
        <em>{t > 0.985 ? words.goal : passed ? `${words.test} ${passed}` : words.start}</em>
        <b className="num">{score}</b>
      </span>
      <figcaption>{words.note}</figcaption>
    </figure>
  );
}
