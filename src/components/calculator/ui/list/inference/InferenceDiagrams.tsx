// FN-59: an inference row's two diagrams, our own drawings of what live Desmos (College Board
// version) shows (captured 2026-10-26):
// - the interval: a bar with end ticks, a dot at the estimate, the bounds written under its ends;
// - the null distribution: the standard normal or t density on −6 to 6, or the chi-square density
//   from 0 to its 99.9th percentile, the p-value's tail or tails shaded in the row colour, a dot at
//   the score (and a hollow one at −score for both tails) with its label under it, and the
//   p-value and df written at the top left.
// The drawing is decorative; the diagram's accessible name says the same in words.

import type { JSX } from "react";
import { chiSquarePdf, chiSquareQuantile } from "@/lib/calculator/core/lib/chi-square";
import { normalPdf, tPdf } from "@/lib/calculator/core/lib/probability";
import { diagramValue, pValue, shownText, type Shown } from "./inference-format";
import type { InferenceView } from "./inference-view";

const W = 258; // the diagram's width
const H = 92; // the plot's height; labels go under it
const BASE = 76; // the axis
const PEAK = 62; // the normal density's peak height, and a chi-square curve's tallest point

/** A Shown as text with a true minus, for labels. */
const text = (s: Shown) => shownText(s);

export function IntervalDiagram(props: { view: InferenceView }): JSX.Element | null {
  const r = props.view.interval;
  if (r === null) return null;
  const [left, right] = [72, 186];
  const span = r.upper - r.lower;
  const at =
    Number.isFinite(span) && span > 0
      ? left + ((r.estimate - r.lower) / span) * (right - left)
      : (left + right) / 2;
  const lower = text(diagramValue(r.lower)),
    upper = text(diagramValue(r.upper));
  const level = text(diagramValue(props.view.level));
  return (
    <div
      className="kc-inf-interval"
      role="img"
      aria-label={`Confidence interval at level ${level}: from ${lower} to ${upper}`}
    >
      <svg viewBox={`0 0 ${W} 22`} aria-hidden="true" focusable="false">
        <line className="kc-inf-bar" x1={left} y1={12} x2={right} y2={12} />
        <line className="kc-inf-bar" x1={left} y1={7} x2={left} y2={17} />
        <line className="kc-inf-bar" x1={right} y1={7} x2={right} y2={17} />
        {Number.isFinite(r.estimate) && (
          <circle className="kc-inf-estimate" cx={at} cy={12} r={2.5} />
        )}
      </svg>
      <span className="kc-inf-bound" style={{ left: `${(left / W) * 100}%` }} aria-hidden="true">
        {lower}
      </span>
      <span className="kc-inf-bound" style={{ left: `${(right / W) * 100}%` }} aria-hidden="true">
        {upper}
      </span>
    </div>
  );
}

interface Frame {
  from: number;
  to: number;
  density: (x: number) => number;
  scale: number; // px per density unit
}

function frameOf(view: InferenceView): Frame | null {
  const dof = view.test?.dof ?? NaN;
  if (view.chiSquare) {
    if (!(dof > 0)) return null;
    const to = chiSquareQuantile(0.999, dof);
    const density = (x: number) => chiSquarePdf(x, dof);
    let tallest = 0;
    for (let px = 2; px <= W; px++) tallest = Math.max(tallest, density((px / W) * to));
    return { from: 0, to, density, scale: tallest > 0 ? PEAK / tallest : 0 };
  }
  const density = view.symbol === "t" ? (x: number) => tPdf(x, dof) : normalPdf;
  return { from: -6, to: 6, density, scale: PEAK / normalPdf(0) };
}

/** The density's polyline points from x = a to b (math units), with the area's corners. */
function curve(f: Frame, a: number, b: number, closed: boolean): string {
  const px = (x: number) => ((x - f.from) / (f.to - f.from)) * W;
  const py = (x: number) => Math.max(0, BASE - Math.min(f.density(x), 1e6) * f.scale);
  const start = Math.max(a, f.from),
    end = Math.min(b, f.to);
  if (!(end > start)) return "";
  const pts: string[] = [];
  if (closed) pts.push(`${px(start).toFixed(2)},${BASE}`);
  const steps = Math.max(2, Math.ceil(px(end) - px(start)));
  for (let k = 0; k <= steps; k++) {
    const x = start + ((end - start) * k) / steps;
    const y = view0(f, x) ? BASE : py(x);
    pts.push(`${px(x).toFixed(2)},${y.toFixed(2)}`);
  }
  if (closed) pts.push(`${px(end).toFixed(2)},${BASE}`);
  return pts.join(" ");
}

/** The chi-square density is infinite at 0 for df < 2; the curve starts just right of it. */
function view0(f: Frame, x: number): boolean {
  return !Number.isFinite(f.density(x));
}

export function NullDistributionDiagram(props: {
  view: InferenceView;
  color: string;
}): JSX.Element | null {
  const { view } = props;
  const test = view.test;
  const f = frameOf(view);
  if (test === null || f === null) return null;
  const score = test.score;
  const px = (x: number) => ((x - f.from) / (f.to - f.from)) * W;
  const inside = (x: number) => Number.isFinite(x) && x >= f.from && x <= f.to;
  const tails: [number, number][] = [];
  if (Number.isFinite(score)) {
    const a = Math.abs(score);
    if (view.tails === "left") tails.push([f.from, score]);
    else if (view.tails === "right") tails.push([score, f.to]);
    else tails.push([f.from, -a], [a, f.to]);
  }
  const ticks = view.chiSquare ? [] : [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  const mirror = view.tails === "both" && !view.chiSquare ? -score : NaN;
  const p = pValue(view.p);
  const scoreText = text(diagramValue(score));
  const dof = view.symbol === "z" ? null : text(diagramValue(test.dof));
  const side = view.tails === "both" ? "both tails" : view.tails === "left" ? "the left tail" : "the right tail"; // prettier-ignore
  const pWords = p.kind === "less" ? `less than ${p.text}` : text(p);
  const label = [
    `p-value ${pWords}`,
    dof === null ? null : `df ${dof}`,
    `${view.symbol} = ${scoreText}`,
    `${side} shaded`,
  ]
    .filter((x) => x !== null)
    .join(", ");
  const clampLabel = (x: number) => Math.min(Math.max(px(x) / W, 0.12), 0.88) * 100;
  return (
    <div className="kc-inf-plot" role="img" aria-label={label}>
      <div className="kc-inf-plot-values" aria-hidden="true">
        <span>
          <var>p</var>-value {p.kind === "less" ? "<" : "="} {p.kind === "less" ? p.text : text(p)}
        </span>
        {dof !== null && <span>df = {dof}</span>}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        focusable="false"
        style={{ color: props.color }}
      >
        {tails.map(([a, b], k) => (
          <polygon key={k} className="kc-inf-tail" points={curve(f, a, b, true)} />
        ))}
        <line className="kc-inf-axis" x1={0} y1={BASE} x2={W} y2={BASE} />
        {ticks.map((t) => (
          <line
            key={t}
            className="kc-inf-tick"
            x1={px(t)}
            y1={BASE - 2.5}
            x2={px(t)}
            y2={BASE + 2.5}
          />
        ))}
        {!view.chiSquare && (
          <line
            className="kc-inf-tick"
            data-major="true"
            x1={px(0)}
            y1={BASE - 5}
            x2={px(0)}
            y2={BASE + 5}
          />
        )}
        <polyline className="kc-inf-curve" points={curve(f, f.from, f.to, false)} />
        {inside(mirror) && <circle className="kc-inf-mirror" cx={px(mirror)} cy={BASE} r={2.5} />}
        {inside(score) && <circle className="kc-inf-score" cx={px(score)} cy={BASE} r={2.5} />}
      </svg>
      <div className="kc-inf-plot-labels" aria-hidden="true">
        {Number.isFinite(score) && (
          <span className="kc-inf-score-label" style={{ left: `${clampLabel(score)}%` }}>
            <var>{view.symbol === "χ²" ? "χ" : view.symbol}</var>
            {view.symbol === "χ²" && <sup>2</sup>} = {scoreText}
          </span>
        )}
        {inside(mirror) && (
          <span className="kc-inf-mirror-label" style={{ left: `${clampLabel(mirror)}%` }}>
            −<var>{view.symbol}</var>
          </span>
        )}
      </div>
    </div>
  );
}
