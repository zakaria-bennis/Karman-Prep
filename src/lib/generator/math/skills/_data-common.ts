/*
 * Shared helpers for the six Problem-Solving and Data Analysis skills (mean, median and spread;
 * reading data displays; scatterplots; probability; samples and margin of error; studies and
 * experiments): exact statistics from raw data, independent checks that recount instead of
 * recomputing, prose for data lists, statement answers, and chart figures in the figure
 * engine's own format (core/figures.ts covers single-series charts; two-series box plots and
 * bar graphs and two-way tables are built here).
 */
import type { FigureSpec, Label, Part, PlaneFrame } from "@/lib/figures/engine/spec";
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { m, num } from "../core/tex";
import type { Answer, Slip } from "../core/types";

export type Q = Frac | number;
export type Pair = [number, number];

// ---------------------------------------------------------------- exact statistics

export const total = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);
export const meanOf = (xs: readonly number[]): Frac => F(total(xs), xs.length);
export const ascending = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);

/** The median by position in the sorted list (the usual definition). */
export function medianOf(xs: readonly number[]): Frac {
  const s = ascending(xs);
  const n = s.length;
  return n % 2 ? F(s[(n - 1) / 2]) : F(s[n / 2 - 1] + s[n / 2], 2);
}

export const rangeOf = (xs: readonly number[]): number => Math.max(...xs) - Math.min(...xs);

/** The sum of squared deviations from the mean, exactly: n times the population variance. */
export function sumSquares(xs: readonly number[]): Frac {
  const mu = meanOf(xs);
  return xs.reduce((s, x) => s.add(F(x).sub(mu).pow(2)), F(0));
}

/** The population variance, exactly (the order of standard deviations is the order of these). */
export const varianceOf = (xs: readonly number[]): Frac => sumSquares(xs).div(xs.length);

/** A list from [value, count] pairs. */
export function expand(pairs: readonly (readonly [number, number])[]): number[] {
  const out: number[] = [];
  for (const [v, c] of pairs) for (let i = 0; i < c; i++) out.push(v);
  return out;
}

// ---------------------------------------------------------------- independent checks

/** c is the mean exactly when the deviations from c add to 0 (no division). */
export function isMeanOf(xs: readonly number[], c: Frac): boolean {
  return xs.reduce((s, x) => s.add(F(x).sub(c)), F(0)).isZero();
}

/**
 * c is the median, decided by counting values below, at and above c (no sorting by position).
 * With c in the list, at most ceil(n/2) - 1 values may sit on each side; with c not in the
 * list, n is even, half the values sit on each side, and c is halfway between its neighbours.
 */
export function isMedianOf(xs: readonly number[], c: Frac): boolean {
  const n = xs.length;
  const below = xs.filter((x) => F(x).lt(c));
  const above = xs.filter((x) => F(x).gt(c));
  const at = n - below.length - above.length;
  if (at > 0) {
    const most = Math.ceil(n / 2) - 1;
    return below.length <= most && above.length <= most;
  }
  if (n % 2 || below.length !== n / 2 || above.length !== n / 2) return false;
  return F(Math.max(...below) + Math.min(...above)).eq(c.mul(2));
}

/** c is the range: no two values differ by more than c, and two differ by exactly c. */
export function isRangeOf(xs: readonly number[], c: Frac): boolean {
  let widest = 0;
  for (const a of xs) for (const b of xs) widest = Math.max(widest, a - b);
  return F(widest).eq(c);
}

// ---------------------------------------------------------------- answers

/** A candidate's rational value, or null when it is not a number. */
export const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

/** A number as MathText: a terminating value as a decimal, otherwise a fraction. */
export function numText(v: Q, opts: { fraction?: boolean } = {}): string {
  return m(num(v, { decimal: !opts.fraction }));
}

export function numAns(v: Q, opts: { fraction?: boolean } = {}): Answer {
  return { text: numText(v, opts), value: Sym.rat(F(v)) };
}

export function numSlip(v: Q, why: string, opts: { fraction?: boolean } = {}): Slip {
  return { ...numAns(v, opts), why };
}

/** A fraction shown as written, not reduced (the SAT prints 12/48 as a choice). */
export function rawFrac(n: number, d: number): string {
  return d === 1 ? m(String(n)) : m(`\\frac{${n}}{${d}}`);
}

export function rawFracAns(n: number, d: number): Answer {
  return { text: rawFrac(n, d), value: Sym.rat(F(n, d)) };
}

export function rawFracSlip(n: number, d: number, why: string): Slip {
  return { ...rawFracAns(n, d), why };
}

/** A statement choice; its closing period is dropped so the explanation can follow it with a colon. */
const bare = (text: string) => text.replace(/\.$/, "");
/**
 * The stored key for a typed answer: a decimal when the value terminates and fits the box, so the
 * builder's "You can enter 3/5 or .6" line (which its own render check rejects for values below 1)
 * is not written; undefined (the builder's default) otherwise.
 */
export function sprKey(v: Q): string | undefined {
  const q = F(v);
  if (q.isInt() || !q.terminates()) return undefined;
  const full = q.toDecimal();
  const short = full.replace(/^(-?)0\./, "$1.");
  const limit = q.n < 0 ? 6 : 5;
  if (full.length <= limit) return full;
  return short.length <= limit ? short : undefined;
}

export const statement = (text: string, key: string): Answer => ({ text: bare(text), key });
export const stmtSlip = (text: string, key: string, why: string): Slip => ({
  text: bare(text),
  key,
  why,
});

/** Keeps the slips whose value is a whole number, for questions whose choices are whole numbers. */
export function wholeOnly(slips: Slip[]): Slip[] {
  return slips.filter((s) => {
    const v = s.value?.asRat();
    return !v || (v.isInt() && v.n >= 0);
  });
}

// ---------------------------------------------------------------- prose

/** A whole number for prose, with commas from 1,000 up: 1,353. */
export function prose(n: number): string {
  if (!Number.isInteger(n)) throw new RangeError(`prose needs an integer, got ${n}`);
  const sign = n < 0 ? "-" : "";
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** A terminating decimal for prose, with a leading zero: 0.75, 14.88, 1,250.5. */
export function proseDec(q: Q): string {
  const text = F(q).toDecimal();
  const [whole, frac] = text.split(".");
  return `${prose(Number(whole))}${frac ? `.${frac}` : ""}`;
}

/** A data list as the SAT prints it: "28, 28, 29" or "3,910; 3,910; 3,430" from 1,000 up. */
export function listText(xs: readonly number[]): string {
  const big = xs.some((x) => Math.abs(x) >= 1000);
  return xs.map((x) => (Number.isInteger(x) ? prose(x) : proseDec(x))).join(big ? "; " : ", ");
}

/** "a + b + c" in math, for adding a list. */
export function sumTex(xs: readonly number[]): string {
  return xs.map((x) => num(x)).join(" + ");
}

export function ordinal(k: number): string {
  const tail = k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] || "th";
  return `${k}${tail}`;
}

/** "a", "a and b", "a, b, and c". */
export function andList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Capital first letter, for a phrase that starts a sentence. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- figures

const VERSION = "figure-spec/1" as const;

/** A two-column (or wider) table with a header row. */
export function tableFig(
  header: string[],
  rows: string[][],
  opts: { title?: string; groups?: { label: string; span: number }[]; note?: string } = {}
): FigureSpec {
  return {
    version: VERSION,
    type: "table",
    parts: [
      {
        kind: "table",
        id: "t1",
        header,
        rows,
        ...(opts.groups ? { groups: opts.groups } : {}),
        ...(opts.note ? { note: opts.note } : {}),
      },
    ],
    labels: [],
    marks: [],
    ...(opts.title ? { title: opts.title } : {}),
  };
}

/** A histogram with long axis names (as the SAT prints them) and bins of the data's own width. */
export function histFig(
  bins: Pair[],
  width: number,
  yTop: number,
  names: { x: string; y: string },
  opts: { yStep?: number; yLabelStep?: number; title?: string } = {}
): FigureSpec {
  const lo = bins[0][0];
  const hi = bins[bins.length - 1][0] + width;
  const frame: PlaneFrame = {
    x: [lo, hi],
    y: [0, yTop],
    step: width,
    yStep: opts.yStep ?? 1,
    ...(opts.yLabelStep ? { yLabelStep: opts.yLabelStep } : {}),
    xLabel: names.x,
    yLabel: names.y,
    ...(lo > 0 ? { xBreak: true } : {}),
    originLabel: "both",
  };
  return {
    version: VERSION,
    type: "histogram",
    frame,
    parts: [{ kind: "series", id: "s1", seriesKind: "histogram", values: bins }],
    labels: [],
    marks: [],
    ...(opts.title ? { title: opts.title } : {}),
  };
}

/** A dot plot on a number line from lo to hi. */
export function dotFig(
  counts: Pair[],
  lo: number,
  hi: number,
  name: string,
  opts: { step?: number; labelStep?: number; title?: string } = {}
): FigureSpec {
  const tallest = Math.max(...counts.map(([, c]) => c));
  return {
    version: VERSION,
    type: "dot_plot",
    frame: {
      x: [lo, hi],
      y: [0, tallest + 1],
      step: opts.step ?? 1,
      ...(opts.labelStep ? { labelStep: opts.labelStep } : {}),
      xLabel: name,
    },
    parts: [{ kind: "series", id: "s1", values: counts.filter(([, c]) => c > 0) }],
    labels: [],
    marks: [],
    ...(opts.title ? { title: opts.title } : {}),
  };
}

/** One or two box plots on a shared number line, each named when there are two. */
export function boxFig(
  boxes: { five: [number, number, number, number, number]; name?: string }[],
  lo: number,
  hi: number,
  axis: string,
  opts: { step?: number; labelStep?: number; title?: string } = {}
): FigureSpec {
  const parts: Part[] = boxes.map((b, i) => ({
    kind: "series",
    id: `b${i + 1}`,
    seriesKind: "box_plot",
    values: b.five,
  }));
  const labels: Label[] = boxes.flatMap((b, i) =>
    b.name ? [{ on: `b${i + 1}`, text: b.name }] : []
  );
  return {
    version: VERSION,
    type: "box_plot",
    frame: {
      x: [lo, hi],
      y: [0, boxes.length],
      grid: false,
      step: opts.step ?? 1,
      ...(opts.labelStep ? { labelStep: opts.labelStep } : {}),
      xLabel: axis,
      yLabel: "",
    },
    parts,
    labels,
    marks: [],
    ...(opts.title ? { title: opts.title } : {}),
  };
}

/** A bar graph over named categories: one series, or two side by side with a legend. */
export function barFig(
  categories: string[],
  series: { values: number[]; name?: string }[],
  yTop: number,
  names: { x?: string; y: string },
  opts: { yStep?: number; yLabelStep?: number; title?: string; rotate?: boolean } = {}
): FigureSpec {
  const parts: Part[] = series.map((s, i) => ({
    kind: "series",
    id: `s${i + 1}`,
    seriesKind: "bar",
    values: s.values,
  }));
  const labels: Label[] = series.flatMap((s, i) =>
    s.name ? [{ on: `s${i + 1}`, text: s.name }] : []
  );
  return {
    version: VERSION,
    type: "bar",
    frame: {
      x: [0, categories.length],
      y: [0, yTop],
      yStep: opts.yStep ?? 1,
      ...(opts.yLabelStep ? { yLabelStep: opts.yLabelStep } : {}),
      ...(names.x ? { xTitle: names.x } : {}),
      yTitle: names.y,
      categories,
      ...(opts.rotate ? { rotateCategories: true } : {}),
    },
    parts,
    labels,
    marks: [],
    ...(opts.title ? { title: opts.title } : {}),
  };
}

/** A tick step that gives about `target` intervals over [0, top]: 1, 2, 5, 10, 20, 25, 50, ... */
export function niceStep(top: number, target = 8): number {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];
  return steps.find((s) => top / s <= target) ?? 10000;
}

/** The axis top: the next multiple of the step at or above the largest value, with room above. */
export function axisTop(largest: number, step: number): number {
  return Math.ceil((largest + step * 0.5) / step) * step;
}
