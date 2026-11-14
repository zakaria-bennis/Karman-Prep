"use client";

// TRIAL: the drawings for two of the five guarantee openings (GuaranteeOpeners.tsx): the cheque and the
// climb. Drawn in code. Styles: guarantee-options.css.
import { useRef, type CSSProperties } from "react";
import { GUARANTEE as G, PRO_PLAN as PRO } from "@/lib/marketing/offer";
import { Signature, usd, useRun, type Deal } from "./guarantee-opener-kit";

const ONES =
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(
    " "
  );
const TENS = "  twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
/** 995 becomes "nine hundred ninety-five", the way a cheque spells its amount. */
function words(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${words(n % 100)}` : ""}`;
  return `${words(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${words(n % 1000)}` : ""}`;
}

/** The refund cheque: made out to the family for the most that can come back, void once we hit the score.
 *  It leans toward the pointer. */
export function Cheque({ d }: { d: Deal }) {
  const el = useRef<HTMLDivElement>(null);
  const lean = (e: React.PointerEvent) => {
    const r = el.current?.getBoundingClientRect();
    if (!r || e.pointerType === "touch") return;
    el.current?.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -9}deg`);
    el.current?.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`);
  };
  const rest = () => {
    el.current?.style.setProperty("--rx", "0deg");
    el.current?.style.setProperty("--ry", "0deg");
  };
  const high = d.gain === null;
  const whole = Math.floor(d.most);
  const cents = Math.round((d.most - whole) * 100);
  const spelled = words(whole);
  return (
    <div className="go2-stage" onPointerMove={lean} onPointerLeave={rest}>
      <div className="go2-chq" ref={el} aria-live="polite">
        <div className="go2-top">
          <b>Karman Prep</b>
          <span>
            Date <i>The day scores come out</i>
          </span>
        </div>
        <p className="go2-to">
          <small>Pay to the order of</small>
          <i>Your family</i>
          <b className="num" key={`${d.most}${high}`}>
            {high ? `${G.highStartProMonths} months of ${PRO.name}` : usd(d.most)}
          </b>
        </p>
        <p className="go2-words">
          <i key={`${d.most}${high}`}>
            {high
              ? "Free, if the score does not rise"
              : `${spelled.charAt(0).toUpperCase()}${spelled.slice(1)} and ${String(cents).padStart(2, "0")}/100`}
          </i>
          <small>dollars</small>
        </p>
        <div className="go2-foot">
          <p>
            <small>For</small>
            <i>
              {high
                ? `A ${d.start} that did not go up`
                : `A ${d.start} that never became a ${d.target}`}
            </i>
          </p>
          <Signature />
        </div>
        <div className="go2-last">
          <p className="go2-micr num" aria-hidden="true">
            ⑆ {d.start} ⑆ {d.target ?? "····"} ⑈ {String(d.price).padStart(4, "0")}
          </p>
          <p className="go2-void" key={`${d.target}`}>
            <b>Void</b>
            <span>{high ? "when the score rises" : `at ${d.target}`}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** The climb: base camp is today's score and the flag is the score we promise. The peak stands taller the
 *  more points are promised. The trail is marked with what comes back from each stretch. */
export function Climb({ d }: { d: Deal }) {
  const gain = useRun(d.gain ?? 20);
  const W = 1000;
  const BASE = 372;
  const h = 140 + gain * 1.02;
  const peak = { x: 600, y: BASE - h };
  const camp = { x: 215, y: BASE - 14 };
  /** A point `t` of the way from base camp to the flag, along the trail. */
  const on = (t: number) => ({
    x: camp.x + (peak.x - camp.x) * t,
    y: camp.y + (peak.y - camp.y) * t - Math.sin(t * Math.PI) * 10,
  });
  const mid = on(0.5);
  const snow = 0.74;
  const s = (t: number, side: 1 | -1) =>
    side === 1 ? { x: peak.x + (880 - peak.x) * (1 - t), y: peak.y + h * (1 - t) } : on(t);
  const sl = s(snow, -1);
  const sr = s(snow, 1);
  const pct = (p: { x: number; y: number }) =>
    ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / 440) * 100}%` }) as CSSProperties;
  const trail = Array.from({ length: 21 }, (_, i) => on(i / 20));
  const path = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const high = d.gain === null;
  const halfPts = d.gain === null ? 0 : d.gain / 2;
  return (
    <figure className="go4-fig" aria-live="polite">
      <div className="go4-scene">
        <svg viewBox={`0 0 ${W} 440`} aria-hidden="true" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="go4-lit" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--rock-hi)" />
              <stop offset="1" stopColor="var(--rock)" />
            </linearGradient>
          </defs>
          {/* far ridges */}
          <circle className="sun" cx="840" cy="92" r="34" />
          <path
            className="cloud"
            d="M96 96 q10 -22 34 -16 q14 -22 40 -8 q26 -4 28 18 q16 4 12 18 h-118 q-12 -6 4 -12Z"
          />
          <path
            className="cloud"
            d="M356 150 q8 -16 26 -12 q12 -16 30 -6 q20 -2 22 14 h-84 q-6 -4 6 4Z"
          />
          <path className="far" d="M0 372 L90 272 L170 312 L260 222 L340 292 L420 252 L520 372Z" />
          <path
            className="far"
            d="M560 372 L700 242 L770 292 L850 212 L930 282 L1000 252 L1000 372Z"
          />
          <path
            className="near"
            d={`M640 ${BASE} L790 ${BASE - h * 0.52} L835 ${BASE - h * 0.4} L960 ${BASE}Z`}
          />
          {/* the peak: a lit face, a face in shade, and a snow cap */}
          <path
            fill="url(#go4-lit)"
            d={`M120 ${BASE} L${peak.x} ${peak.y} L${peak.x + 60} ${BASE}Z`}
          />
          <path
            className="shade"
            d={`M${peak.x} ${peak.y} L880 ${BASE} L${peak.x + 60} ${BASE}Z`}
          />
          {/* crags: light edges on the lit face, dark gullies on the shaded one */}
          {[0.3, 0.48, 0.66].map((t) => (
            <path
              className="crag"
              key={t}
              d={`M${120 + (peak.x - 120) * t + 40} ${BASE - h * t + 26} l34 -22 l22 14 l30 -26`}
            />
          ))}
          {[0.34, 0.56].map((t) => (
            <path
              className="gully"
              key={t}
              d={`M${peak.x + 30 + (880 - peak.x) * (1 - t) * 0.5} ${BASE - h * t} l18 34 l-8 30 l20 40`}
            />
          ))}
          <path
            className="snow"
            d={`M${peak.x} ${peak.y} L${sl.x - 34} ${sl.y + 6} L${sl.x + 30} ${sl.y - 12} L${peak.x - 40} ${sl.y + 16} L${peak.x - 4} ${sl.y - 8} L${peak.x + 30} ${sl.y + 14} L${sr.x - 30} ${sr.y - 10} L${sr.x} ${sr.y}Z`}
          />
          <path
            className="ground"
            d={`M0 ${BASE - 4} Q500 ${BASE - 20} ${W} ${BASE - 4} L${W} 440 L0 440Z`}
          />
          <path
            className="drift"
            d={`M0 ${BASE + 22} Q260 ${BASE + 6} 520 ${BASE + 24} T${W} ${BASE + 14} L${W} 440 L0 440Z`}
          />
          {/* pines at the foot */}
          {[40, 78, 112, 150, 318, 352, 742, 790, 838, 902, 948, 978].map((x, i) => (
            <path
              className="pine"
              key={x}
              d={`M${x} ${BASE - 2} l${-11 - (i % 3) * 2} 0 l${11 + (i % 3) * 2} ${-34 - (i % 2) * 12} l${11 + (i % 3) * 2} ${34 + (i % 2) * 12}Z`}
            />
          ))}
          {/* the trail, in two stretches, then the flag */}
          <path className="trail t1" d={path(trail.slice(0, 11))} />
          <path className="trail t2" d={path(trail.slice(10))} />
          <g transform={`translate(${peak.x} ${peak.y})`}>
            <path className="pole" d="M0 2 V-58" />
            <path className="flag" d="M0 -58 q16 -8 30 0 t30 0 v22 q-16 -8 -30 0 t-30 0Z" />
          </g>
          {/* the hut halfway, and the tent at base camp */}
          {!high && d.cohort ? (
            <g transform={`translate(${mid.x} ${mid.y})`}>
              <path className="hut" d="M-15 0 v-13 l15 -11 l15 11 v13Z" />
              <path className="roof" d="M-19 -12 l19 -14 l19 14" />
            </g>
          ) : null}
          <g transform={`translate(${camp.x} ${camp.y})`}>
            <path className="tent" d="M-20 4 L0 -22 L20 4Z" />
            <path className="tent-door" d="M0 -22 L-5 4 L5 4Z" />
          </g>
        </svg>
        <p className="go4-tag camp" style={pct(camp)}>
          <b className="num">{d.start}</b>
          <span>Today</span>
        </p>
        {high ? null : d.cohort ? (
          <>
            <p className="go4-tag low" style={pct(on(0.22))}>
              <span>
                Under halfway: <b>all {usd(d.price)} back</b>
              </span>
            </p>
            <p className="go4-tag hut" style={pct(mid)}>
              <b className="num">+{halfPts}</b>
              <span>
                Past halfway: <b>{usd(d.half)} back</b>
              </span>
            </p>
          </>
        ) : (
          <p className="go4-tag low" style={pct(on(0.4))}>
            <span>
              Short of the score: <b>{usd(d.half)} back</b>, or {d.orElse}
            </span>
          </p>
        )}
        <p className="go4-tag top" style={pct(peak)}>
          <b className="num">{d.target ?? "Higher"}</b>
          <span>
            {high
              ? `Or ${G.highStartProMonths} months of ${PRO.name} free`
              : `+${d.gain} points, guaranteed`}
          </span>
        </p>
      </div>
    </figure>
  );
}
