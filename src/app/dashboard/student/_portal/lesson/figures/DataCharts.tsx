"use client";

// The data charts drawn on a value axis (DataFigure): bars, lines, histograms and scatter plots, each to
// scale with nice ticks, and the helpers the dot plot, box plot and sample share (DataFigs.tsx). Text is
// ink; a series' color lives in its marks and its legend swatch, in the order warm, blue, green, gold.
// Category names are never shortened or turned: they wrap onto two lines, shrink to 11, or every other
// one steps down a row; only when nothing else fits does the chart widen.
import type { ReactNode } from "react";
import type { DataFigure, Tone } from "@/lib/lessons/figures";
import css from "./data.module.css";
import s from "./figure.module.css";

export type Chart<C extends DataFigure["chart"]> = Extract<DataFigure, { chart: C }>;
export interface Axis {
  lo: number;
  hi: number;
  step: number;
  ticks: number[];
}

/** The width every data picture is drawn at (the coordinate plane's). */
export const W0 = 240;
const PLOT_H = 132;
const TONES: Tone[] = ["warm", "blue", "green", "gold", "ink"];
export const TICK = `${s.label} ${s.small}`;
export const CAT = `${s.label} ${css.cat}`;

export const toneOf = (k: number) => s[TONES[k % TONES.length]];
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const pop = (at: number) => ({ "data-pop": true, "data-at": at });
export const draw = (at: number) => ({ "data-draw": true, "data-at": at });
/** Part i of n draws in one after another, in at most `most` steps. */
export const stepOf = (i: number, n: number, most = 8) =>
  n <= most ? i : Math.floor((i * most) / n);

// ---------------------------------------------------------------- scales and numbers

export function niceStep(range: number, target: number): number {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export const decimals = (step: number) => Math.max(0, -Math.floor(Math.log10(step) + 1e-9));

/** Nice ticks over [min, max]: from 0 with `zero`; 0 joins in with `near0` when the data comes within
 *  half its range of it; whole steps only with `whole`. */
export function niceAxis(
  min: number,
  max: number,
  target: number,
  o: { zero?: boolean; near0?: boolean; whole?: boolean } = {}
): Axis {
  if (!Number.isFinite(min) || !Number.isFinite(max)) [min, max] = [0, 1];
  const near = o.near0 && (min > 0 ? min <= (max - min) / 2 : max < 0 && -max <= (max - min) / 2);
  if (o.zero || near) [min, max] = [Math.min(0, min), Math.max(0, max)];
  if (max - min < 1e-9) {
    const pad = Math.max(1, Math.abs(min) / 10);
    [min, max] = [min === 0 && o.zero ? 0 : min - pad, max + pad];
  }
  const step = Math.max(o.whole ? 1 : 0, niceStep(max - min, target));
  const dec = decimals(step);
  const lo = Math.floor(min / step + 1e-6) * step;
  const hi = Math.ceil(max / step - 1e-6) * step;
  const ticks: number[] = [];
  for (let i = 0; lo + i * step <= hi + step / 1e6; i++) ticks.push(+(lo + i * step).toFixed(dec));
  return { lo: ticks[0], hi: ticks[ticks.length - 1], step, ticks };
}

/** A number as a figure prints it: 4-digit numbers plain (so years read right), grouped from 10,000
 *  or compact on an axis (12K), and a true minus sign. */
export function fmt(v: number, dec = 2, o: { fixed?: boolean; compact?: boolean } = {}): string {
  if (Math.abs(v) < 0.5 * 10 ** -dec) v = 0;
  const a = Math.abs(v);
  let out: string;
  if (o.compact && a >= 1e4) {
    const [u, unit] = a >= 1e9 ? [1e9, "B"] : a >= 1e6 ? [1e6, "M"] : [1e3, "K"];
    out = (v / u).toLocaleString("en-US", { maximumFractionDigits: 2 }) + unit;
  } else
    out = v.toLocaleString("en-US", {
      minimumFractionDigits: o.fixed ? dec : 0,
      maximumFractionDigits: dec,
      useGrouping: a >= 1e4,
    });
  return out.replace("-", "−");
}

export const tickText = (v: number, step: number) =>
  fmt(v, decimals(step), { fixed: true, compact: true });

/** A value for a screen reader ("none" when it is missing). */
export const say = (v: number | undefined) => (Number.isFinite(v) ? fmt(v as number) : "none");

// ---------------------------------------------------------------- text that fits

/** About how wide a label sets, in units, at a font size (Hanken Grotesk, semibold). */
export function textW(t: string, size: number): number {
  let em = 0;
  for (const ch of t)
    em += " ilI.,:;'!|".includes(ch)
      ? 0.3
      : "fjrt()[]-/".includes(ch)
        ? 0.4
        : "mwMW%@".includes(ch)
          ? 0.88
          : /[A-Z0-9$±−+=<>#&?]/.test(ch)
            ? 0.66
            : 0.56;
  return em * size;
}

export const widthOf = (lines: string[], size: number) =>
  Math.max(0, ...lines.map((l) => textW(l, size)));

/** The narrowest way to set a label: on one line, or broken at a space onto two. */
export function narrowest(t: string, size: number): string[] {
  const words = t.trim().split(/\s+/);
  let best = [words.join(" ")];
  for (let i = 1; i < words.length; i++) {
    const two = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    if (widthOf(two, size) < widthOf(best, size)) best = two;
  }
  return best;
}

/** A label on one line if it fits `room`, else on two; null when neither fits. */
export function fitLabel(t: string, room: number, size: number): string[] | null {
  if (textW(t, size) <= room) return [t];
  const two = narrowest(t, size);
  return widthOf(two, size) <= room ? two : null;
}

/** A label at 12, else at 11, on one line or two; at 11 on its narrowest when nothing fits. */
export function fitText(t: string, room: number): { lines: string[]; size: number } {
  for (const size of [12, 11]) {
    const lines = fitLabel(t, room, size);
    if (lines) return { lines, size };
  }
  return { lines: narrowest(t, 11), size: 11 };
}

export const sized = (base: string, size: number) => (size === 11 ? `${base} ${css.tight}` : base);

export interface Cats {
  lines: string[][];
  size: number;
  /** Every other name a row lower, so each has two slots of room. */
  stagger: boolean;
  slot: number;
  /** How many lines of text the names take, top to bottom. */
  depth: number;
}

/** How category names sit under their slots: at 12, then 11, on one or two lines; then every other
 *  name a row lower; and only when nothing else fits, wider slots. */
export function catLayout(labels: string[], slot: number): Cats {
  const make = (lines: string[][], size: number, stagger: boolean, at: number): Cats => {
    const most = Math.max(1, ...lines.map((l) => l.length));
    return { lines, size, stagger, slot: at, depth: most * (stagger ? 2 : 1) };
  };
  for (const stagger of labels.length > 1 ? [false, true] : [false])
    for (const size of [12, 11]) {
      const lines = labels.map((t) => fitLabel(t, (stagger ? 2 : 1) * slot - 6, size));
      if (lines.every(Boolean)) return make(lines as string[][], size, stagger, slot);
    }
  const lines = labels.map((t) => narrowest(t, 11));
  const need = Math.max(...lines.map((l) => widthOf(l, 11))) + 6;
  const many = labels.length > 1;
  return make(lines, 11, many, Math.max(slot, many ? need / 2 : need));
}

/** Which labels along an axis to print, and at what size, so none touch: all of them at 12 or 11,
 *  else every second (or third...). */
export function spread(xs: number[], texts: string[]): { size: number; keep: boolean[] } {
  for (let every = 1; every <= xs.length; every++)
    for (const size of [12, 11]) {
      const keep = xs.map((_, i) => i % every === 0);
      let edge = -Infinity;
      const clear = xs.every((x, i) => {
        if (!keep[i]) return true;
        const half = textW(texts[i], size) / 2;
        const ok = x - half >= edge + 4;
        edge = x + half;
        return ok;
      });
      if (clear) return { size, keep };
    }
  return { size: 11, keep: xs.map((_, i) => i === 0) };
}

// ---------------------------------------------------------------- shared pieces

export function Svg(p: { w: number; h: number; label: string; children: ReactNode }) {
  return (
    <svg
      className={`${s.fig} ${css.chart}`}
      viewBox={`0 0 ${r2(p.w)} ${r2(p.h)}`}
      role="img"
      aria-label={p.label}
    >
      {p.children}
    </svg>
  );
}

/** Text from a baseline, on one line or several (each `lh` below the last). */
export function Txt(p: {
  x: number;
  y: number;
  lines: string | string[];
  c?: string;
  a?: "start" | "middle" | "end";
  lh?: number;
  at?: number;
}) {
  const ls = typeof p.lines === "string" ? [p.lines] : p.lines;
  const x = r2(p.x);
  return (
    <text
      x={x}
      y={r2(p.y)}
      className={p.c ?? s.label}
      textAnchor={p.a}
      {...(p.at === undefined ? {} : pop(p.at))}
    >
      {ls.length === 1
        ? ls[0]
        : ls.map((l, j) => (
            <tspan key={j} x={x} dy={j ? (p.lh ?? 13) : 0}>
              {l}
            </tspan>
          ))}
    </text>
  );
}

/** A series' point. Its shape names the series as surely as its color: circle, square, triangle,
 *  diamond. */
export function Marker(p: { k: number; x: number; y: number; r?: number; at?: number }) {
  const r = p.r ?? 4;
  const a = { className: `${s.dot} ${toneOf(p.k)}`, ...(p.at === undefined ? {} : pop(p.at)) };
  const [x, y] = [r2(p.x), r2(p.y)];
  const k = p.k % 4;
  if (k === 0) return <circle cx={x} cy={y} r={r} {...a} />;
  if (k === 1) {
    const h = r2(r * 0.9);
    return <rect x={r2(x - h)} y={r2(y - h)} width={2 * h} height={2 * h} rx={1} {...a} />;
  }
  const h = r * (k === 2 ? 1.2 : 1.3);
  const d =
    k === 2
      ? `M${x} ${r2(y - h)}L${r2(x + h)} ${r2(y + h * 0.8)}L${r2(x - h)} ${r2(y + h * 0.8)}Z`
      : `M${x} ${r2(y - h)}L${r2(x + h)} ${y}L${x} ${r2(y + h)}L${r2(x - h)} ${y}Z`;
  return <path d={d} {...a} />;
}

function legendAt(names: string[], room: number, sw: number) {
  let x = 0;
  let row = 0;
  const at = names.map((n) => {
    const w = sw + 5 + textW(n, 12);
    if (x > 0 && x + w > room) [x, row] = [0, row + 1];
    const p = { x, row };
    x += w + 14;
    return p;
  });
  return { at, rows: names.length ? row + 1 : 0 };
}

/** The legend: a swatch (a square for bars, a stroke with its point for lines) and the name. */
function Legend(p: { names: string[]; y: number; room: number; line: boolean }) {
  const sw = p.line ? 18 : 10;
  const { at } = legendAt(p.names, p.room, sw);
  return (
    <g>
      {p.names.map((n, k) => {
        const x = 2 + at[k].x;
        const cy = p.y + at[k].row * 18 + 7;
        return (
          <g key={k} className={toneOf(k)}>
            {p.line ? (
              <>
                <line x1={x} x2={x + sw} y1={cy} y2={cy} className={s.line} />
                <Marker k={k} x={x + sw / 2} y={cy} r={3.4} />
              </>
            ) : (
              <rect x={x} y={cy - 5} width={10} height={10} rx={2.5} className={css.swatch} />
            )}
            <Txt x={x + sw + 5} y={cy + 4} lines={n} c={CAT} />
          </g>
        );
      })}
    </g>
  );
}

/** The legend rows and the y axis's name above a plot, and where the plot can start. */
function headOf(names: string[], yLabel: string | undefined, W: number, line = false) {
  const rows = legendAt(names, W - 4, line ? 18 : 10).rows;
  let y = 4 + rows * 18 + (rows ? 2 : 0);
  const name = yLabel ? fitText(yLabel, W - 4) : null;
  const nameY = y + 10;
  if (name) y += name.lines.length * 13 + 2;
  const el = (
    <>
      {rows > 0 && <Legend names={names} y={4} room={W - 4} line={line} />}
      {name && <Txt x={2} y={nameY} lines={name.lines} c={sized(CAT, name.size)} />}
    </>
  );
  return { el, top: y + 8 };
}

/** The value axis: a faint line across at each tick, its number at the left, a thin rule up the side. */
function YAxis(p: { ax: Axis; Y: (v: number) => number; x0: number; x1: number }) {
  return (
    <g>
      {p.ax.ticks.map((v) => (
        <g key={v}>
          <line x1={p.x0} x2={p.x1} y1={r2(p.Y(v))} y2={r2(p.Y(v))} className={s.faint} />
          <Txt x={p.x0 - 6} y={p.Y(v) + 4} lines={tickText(v, p.ax.step)} c={TICK} a="end" />
        </g>
      ))}
      <line x1={p.x0} x2={p.x0} y1={r2(p.Y(p.ax.hi))} y2={r2(p.Y(p.ax.lo))} className={s.thin} />
    </g>
  );
}

/** The left margin a value axis needs for its numbers. */
const marginOf = (ax: Axis) =>
  Math.max(...ax.ticks.map((v) => textW(tickText(v, ax.step), 12))) + 11;

/** The category names under their slots (every other one a row lower when staggered). */
function CatLabels(p: { cats: Cats; x: (i: number) => number; y: number; lit?: Set<number> }) {
  const { cats } = p;
  const lh = cats.size + 2;
  const drop = (cats.depth / (cats.stagger ? 2 : 1)) * lh;
  const c = sized(CAT, cats.size);
  return (
    <g>
      {cats.lines.map((lines, i) => (
        <Txt
          key={i}
          x={p.x(i)}
          y={p.y + (cats.stagger && i % 2 ? drop : 0)}
          lines={lines}
          lh={lh}
          a="middle"
          c={p.lit?.has(i) ? `${c} ${css.catLit}` : c}
        />
      ))}
    </g>
  );
}

/** A bar from the baseline to its value: square at the baseline, its data end rounded. */
export function barPath(x: number, w: number, base: number, end: number, r = 4): string {
  const k = Math.min(r, w / 2, Math.abs(base - end));
  const t = r2(end + (end < base ? k : -k));
  const [x1, x2, e] = [r2(x), r2(x + w), r2(end)];
  return `M${x1} ${r2(base)}V${t}Q${x1} ${e} ${r2(x + k)} ${e}H${r2(x + w - k)}Q${x2} ${e} ${x2} ${t}V${r2(base)}Z`;
}

/** The plot frame shared by bars and lines: margins, category names, legend, axis name, scale. */
function frame(ax: Axis, labels: string[], names: string[], yLabel?: string, line = false) {
  const n = labels.length;
  const L = marginOf(ax);
  const R = 6;
  const cats = catLayout(labels, (W0 - L - R) / Math.max(1, n));
  const W = n ? L + R + cats.slot * n : W0;
  const { el, top } = headOf(names, yLabel, W, line);
  const base = top + PLOT_H;
  return {
    L,
    R,
    W,
    cats,
    el,
    base,
    H: base + 15 + (cats.depth - 1) * (cats.size + 2) + 6,
    X: (i: number) => L + cats.slot * (i + 0.5),
    Y: (v: number) => base - ((v - ax.lo) / (ax.hi - ax.lo)) * PLOT_H,
  };
}

// ---------------------------------------------------------------- the charts

/** Bars: one series, or several grouped (highlight names categories, by index). */
export function BarChart({ fig }: { fig: Chart<"bar"> }) {
  const series = (Array.isArray(fig.values[0]) ? fig.values : [fig.values]) as number[][];
  const S = series.length;
  const n = fig.labels.length;
  const vals = series.flat().filter(Number.isFinite);
  const ax = niceAxis(Math.min(0, ...vals), Math.max(0, ...vals), 4, { zero: true });
  const names =
    S > 1 || fig.legend?.length ? series.map((_, k) => fig.legend?.[k] || `Series ${k + 1}`) : [];
  const f = frame(ax, fig.labels, names, fig.yLabel);
  const bw = Math.max(1, Math.min(22, (f.cats.slot * 0.72 - 2 * (S - 1)) / S));
  const group = bw * S + 2 * (S - 1);
  const lit = new Set(fig.highlight ?? []);
  const each = (l: string, i: number) =>
    S === 1
      ? `${l} ${say(series[0][i])}`
      : `${l}: ${series.map((vs, k) => `${names[k]} ${say(vs[i])}`).join(", ")}`;
  const label = `Bar chart${fig.yLabel ? ` of ${fig.yLabel}` : ""}: ${fig.labels.map(each).join("; ")}`;
  return (
    <Svg w={f.W} h={f.H} label={label}>
      {f.el}
      <YAxis ax={ax} Y={f.Y} x0={f.L} x1={f.W - f.R} />
      {fig.labels.map((_, i) =>
        series.map((vs, k) => {
          const v = vs[i];
          if (!Number.isFinite(v) || v === 0) return null;
          const state = lit.size ? (lit.has(i) ? css.lit : css.quiet) : "";
          return (
            <path
              key={`${i}-${k}`}
              d={barPath(f.X(i) - group / 2 + k * (bw + 2), bw, f.Y(0), f.Y(v))}
              className={`${css.bar} ${toneOf(k)} ${state}`}
              {...pop(1 + stepOf(i, n))}
            />
          );
        })
      )}
      <line x1={f.L} x2={f.W - f.R} y1={r2(f.Y(0))} y2={r2(f.Y(0))} className={s.thin} />
      <CatLabels cats={f.cats} x={f.X} y={f.base + 15} lit={lit} />
    </Svg>
  );
}

/** Lines: each series traced, then its points; nice ticks that need not start at 0. */
export function LineChart({ fig }: { fig: Chart<"line"> }) {
  const n = fig.labels.length;
  const vals = fig.series.flatMap((se) => se.values).filter(Number.isFinite);
  const ax = niceAxis(Math.min(...vals), Math.max(...vals), 4, { near0: true });
  const names = fig.series.map((se, k) => se.name || `Series ${k + 1}`);
  const f = frame(ax, fig.labels, names, fig.yLabel, true);
  const pathOf = (vs: number[]) => {
    let d = "";
    let pen = false;
    vs.forEach((v, i) => {
      if (!Number.isFinite(v) || i >= n) return void (pen = false);
      d += `${pen ? "L" : "M"}${r2(f.X(i))} ${r2(f.Y(v))}`;
      pen = true;
    });
    return d;
  };
  const label =
    `Line graph${fig.yLabel ? ` of ${fig.yLabel}` : ""}: ` +
    fig.series
      .map(
        (se, k) =>
          `${names[k]}, ${fig.labels.map((l, i) => `${l} ${say(se.values[i])}`).join(", ")}`
      )
      .join("; ");
  const zero = ax.lo < 0 && ax.hi > 0;
  return (
    <Svg w={f.W} h={f.H} label={label}>
      {f.el}
      <YAxis ax={ax} Y={f.Y} x0={f.L} x1={f.W - f.R} />
      {[ax.lo, ...(zero ? [0] : [])].map((v) => (
        <line key={v} x1={f.L} x2={f.W - f.R} y1={r2(f.Y(v))} y2={r2(f.Y(v))} className={s.thin} />
      ))}
      {fig.series.map((se, k) => (
        <path
          key={k}
          d={pathOf(se.values)}
          className={`${s.line} ${toneOf(k)}`}
          {...draw(1 + 2 * k)}
        />
      ))}
      {fig.series.map((se, k) =>
        se.values.map((v, i) =>
          Number.isFinite(v) && i < n ? (
            <Marker key={`${k}-${i}`} k={k} x={f.X(i)} y={f.Y(v)} at={2 + 2 * k} />
          ) : null
        )
      )}
      <CatLabels cats={f.cats} x={f.X} y={f.base + 15} />
    </Svg>
  );
}

/** A histogram: columns side by side over [from, to) bins, the bin edges labeled under. */
export function Histogram({ fig }: { fig: Chart<"histogram"> }) {
  const bins = fig.bins
    .filter((b) => b.every(Number.isFinite) && b[1] > b[0])
    .sort((p, q) => p[0] - q[0]);
  const from = bins.length ? bins[0][0] : 0;
  const to = bins.length ? Math.max(...bins.map((b) => b[1])) : 1;
  const ax = niceAxis(0, Math.max(0, ...bins.map((b) => b[2])), 4, { zero: true, whole: true });
  const L = marginOf(ax);
  const [R, W, top] = [10, W0, 12];
  const base = top + PLOT_H;
  const X = (v: number) => L + ((v - from) / (to - from)) * (W - L - R);
  const Y = (v: number) => base - ((v - ax.lo) / (ax.hi - ax.lo)) * PLOT_H;
  const edges = [...new Set(bins.flatMap((b) => [b[0], b[1]]))].sort((p, q) => p - q);
  const texts = edges.map((e) => fmt(e));
  const { size, keep } = spread(edges.map(X), texts);
  const label = `Histogram: ${bins.map(([a, b, c]) => `${fmt(a)} to ${fmt(b)}, ${fmt(c)}`).join("; ")}`;
  return (
    <Svg w={W} h={base + 22} label={label}>
      <YAxis ax={ax} Y={Y} x0={L} x1={W - R} />
      {bins.map(([a, b, c], i) =>
        c > 0 ? (
          <path
            key={i}
            d={barPath(X(a) + 1, Math.max(1, X(b) - X(a) - 2), Y(0), Y(c), 3)}
            className={`${css.bar} ${s.warm}`}
            {...pop(1 + stepOf(i, bins.length))}
          />
        ) : null
      )}
      <line x1={L} x2={W - R} y1={r2(base)} y2={r2(base)} className={s.thin} />
      {edges.map((e, i) =>
        keep[i] ? (
          <g key={e}>
            <line x1={r2(X(e))} x2={r2(X(e))} y1={base} y2={base + 4} className={s.thin} />
            <Txt x={X(e)} y={base + 16} lines={texts[i]} a="middle" c={sized(TICK, size)} />
          </g>
        ) : null
      )}
    </Svg>
  );
}

/** A padded nice axis over values: a little room past the data, 0 included when it is close. */
function axisOf(vs: number[]): Axis {
  if (!vs.length) return niceAxis(0, 10, 5);
  const [lo, hi] = [Math.min(...vs), Math.max(...vs)];
  const m = (hi - lo) * 0.06;
  return niceAxis(
    lo >= 0 ? Math.max(0, lo - m) : lo - m,
    hi <= 0 ? Math.min(0, hi + m) : hi + m,
    5,
    { near0: true }
  );
}

/** The part of y = m x + b inside the window, or null. */
function clipLine([m, b]: [number, number], xa: Axis, ya: Axis) {
  let [x0, x1] = [xa.lo, xa.hi];
  if (m !== 0) {
    const [p, q] = [(ya.lo - b) / m, (ya.hi - b) / m];
    x0 = Math.max(x0, Math.min(p, q));
    x1 = Math.min(x1, Math.max(p, q));
  } else if (b < ya.lo || b > ya.hi) return null;
  return x1 > x0 ? [x0, m * x0 + b, x1, m * x1 + b] : null;
}

/** A scatter plot: the points, then a line of best fit traced across the window. */
export function Scatter({ fig }: { fig: Chart<"scatter"> }) {
  const pts = fig.points.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  const xa = axisOf(pts.map((p) => p[0]));
  const ya = axisOf(pts.map((p) => p[1]));
  const L = marginOf(ya);
  const [R, W] = [10, W0];
  const yName = fig.yLabel ? fitText(fig.yLabel, W - 4) : null;
  const top = yName ? 14 + (yName.lines.length - 1) * 13 + 10 : 12;
  const plotH = Math.min(170, W - L - R);
  const base = top + plotH;
  const xName = fig.xLabel ? fitText(fig.xLabel, W - 4) : null;
  const H = base + 22 + (xName ? xName.lines.length * 13 + 4 : 0);
  const X = (v: number) => L + ((v - xa.lo) / (xa.hi - xa.lo)) * (W - L - R);
  const Y = (v: number) => base - ((v - ya.lo) / (ya.hi - ya.lo)) * plotH;
  const xt = xa.ticks.map((v) => tickText(v, xa.step));
  const { size, keep } = spread(xa.ticks.map(X), xt);
  const seg = fig.fit ? clipLine(fig.fit, xa, ya) : null;
  const last = pts.length ? 1 + stepOf(pts.length - 1, pts.length, 6) : 0;
  const fitSay = fig.fit
    ? `, with the line of best fit y = ${fmt(fig.fit[0])}x ${fig.fit[1] < 0 ? "−" : "+"} ${fmt(Math.abs(fig.fit[1]))}`
    : "";
  const label = `Scatter plot of ${pts.length} points${fig.xLabel ? `, ${fig.xLabel} across` : ""}${
    fig.yLabel ? `, ${fig.yLabel} up` : ""
  }${fitSay}`;
  return (
    <Svg w={W} h={H} label={label}>
      {yName && <Txt x={2} y={14} lines={yName.lines} c={sized(CAT, yName.size)} />}
      <YAxis ax={ya} Y={Y} x0={L} x1={W - R} />
      {xa.ticks.map((v, i) => (
        <g key={v}>
          <line x1={r2(X(v))} x2={r2(X(v))} y1={top} y2={base} className={s.faint} />
          {keep[i] && <Txt x={X(v)} y={base + 16} lines={xt[i]} a="middle" c={sized(TICK, size)} />}
        </g>
      ))}
      <line x1={L} x2={W - R} y1={r2(base)} y2={r2(base)} className={s.thin} />
      {xa.lo < 0 && xa.hi > 0 && (
        <line x1={r2(X(0))} x2={r2(X(0))} y1={top} y2={base} className={s.thin} />
      )}
      {ya.lo < 0 && ya.hi > 0 && (
        <line x1={L} x2={W - R} y1={r2(Y(0))} y2={r2(Y(0))} className={s.thin} />
      )}
      {xName && (
        <Txt
          x={(L + W - R) / 2}
          y={base + 34}
          lines={xName.lines}
          a="middle"
          c={sized(CAT, xName.size)}
        />
      )}
      {seg && (
        <line
          x1={r2(X(seg[0]))}
          y1={r2(Y(seg[1]))}
          x2={r2(X(seg[2]))}
          y2={r2(Y(seg[3]))}
          className={`${s.line} ${s.blue}`}
          {...draw(last + 1)}
        />
      )}
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={r2(X(x))}
          cy={r2(Y(y))}
          r={4}
          className={`${s.dot} ${s.warm}`}
          {...pop(1 + stepOf(i, pts.length, 6))}
        />
      ))}
    </Svg>
  );
}
