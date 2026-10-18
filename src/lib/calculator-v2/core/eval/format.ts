// Display text for numbers, points, complex values and axis labels (NM-1 to NM-3, NM-5, NM-6,
// NM-8, NM-20; 01-interfaces.md section 4). Hyphen-minus for signs; scientific form m×10^n with ×
// U+00D7 and a plain exponent. T-10 thin-space grouping is the renderer's job, never done here.
// Pure TypeScript: no DOM (AR-44).

import type { Complex, Value } from "./values";

const SIGNIFICANT_DIGITS = 12; // NM-1
const PLAIN_MIN = 1e-6; // NM-2: 10^-6 ≤ |v| < 10^12 shows as a plain decimal
const PLAIN_MAX = 1e12;
const NEGLIGIBLE_PART = 1e-14; // NM-20: |part| ≤ 10^-14·|other part| is omitted
const AXIS_ZERO = 1e-6; // NM-8: |v| < 10^-6·step labels as 0
const TIMES = "×";

interface Style {
  undefined: string;
  scientific: (mantissa: string, exponent: string) => string;
  point: (a: string, b: string) => string;
  list: (items: string[]) => string;
}

const TEXT: Style = {
  undefined: "undefined",
  scientific: (m, e) => `${m}${TIMES}10^${e}`,
  point: (a, b) => `(${a}, ${b})`,
  list: (items) => `[${items.join(", ")}]`, // until NM-38
};

const LATEX: Style = {
  undefined: "\\mathrm{undefined}",
  scientific: (m, e) => `${m}\\times10^{${e}}`,
  point: (a, b) => `\\left(${a},${b}\\right)`,
  list: (items) => `\\left[${items.join(",")}\\right]`,
};

/** Trailing fraction zeros and a bare "." removed: "1.500" → "1.5", "2.000" → "2", "10" → "10". */
function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** `x.toFixed(digits)` with the digit count clamped to toFixed's own range of 0 to 100. */
function fixed(x: number, digits: number): string {
  return x.toFixed(Math.min(100, Math.max(0, digits)));
}

function formatReal(v: number, style: Style): string {
  if (!Number.isFinite(v)) return style.undefined;
  const r = Number(v.toPrecision(SIGNIFICANT_DIGITS));
  if (r === 0) return "0"; // also -0
  const a = Math.abs(r);
  if (a >= PLAIN_MIN && a < PLAIN_MAX) return String(r);
  const [mantissa, exponent] = r.toExponential(SIGNIFICANT_DIGITS - 1).split("e");
  return style.scientific(trimZeros(mantissa), String(Number(exponent)));
}

function formatComplex({ re, im }: Complex, style: Style): string {
  if (!Number.isFinite(re) || !Number.isFinite(im)) return style.undefined;
  const reText = Math.abs(re) > NEGLIGIBLE_PART * Math.abs(im) ? formatReal(re, style) : "";
  if (Math.abs(im) <= NEGLIGIBLE_PART * Math.abs(re)) return reText || "0";
  const imNumber = formatReal(im, style);
  const imText = imNumber === "1" ? "i" : imNumber === "-1" ? "-i" : `${imNumber}i`;
  if (!reText) return imText;
  return imText.startsWith("-") ? `${reText}${imText}` : `${reText}+${imText}`;
}

function format(v: Value, style: Style): string {
  switch (v.type) {
    case "number":
      return formatReal(v.value, style);
    case "complex":
      return formatComplex(v.value, style);
    case "point":
      return style.point(formatReal(v.value[0], style), formatReal(v.value[1], style));
    case "list":
      return style.list(v.value.map((item) => format(item, style)));
    case "undefined":
      return style.undefined;
  }
}

/** NM-1 to NM-3, NM-6: 12 significant digits, plain or m×10^n, -0 as 0, non-finite `undefined`. */
export function formatNumber(v: number): string {
  return formatReal(v, TEXT);
}

/** NM-5, NM-6, NM-20: points `(a, b)`, complex `a+bi` with negligible parts omitted. */
export function formatValue(v: Value): string {
  return format(v, TEXT);
}

/** formatValue's text as LaTeX: `\times10^{n}`, `\left(a,b\right)`, `\mathrm{undefined}`. */
export function formatValueLatex(v: Value): string {
  return format(v, LATEX);
}

/**
 * NM-8: a tick label with the fewest decimals `step` needs, switching to m×10^n outside NM-2's
 * plain range. The renderer (08) calls it per major tick.
 */
export function formatAxisLabel(v: number, step: number): string {
  if (!Number.isFinite(v)) return TEXT.undefined;
  const k = Math.floor(Math.log10(step) + 1e-9);
  const a = Math.abs(v);
  if (a < AXIS_ZERO * step) return "0";
  if (a >= PLAIN_MIN && a < PLAIN_MAX) {
    const plain = trimZeros(fixed(v, -k));
    return plain === "-0" ? "0" : plain;
  }
  let n = Math.floor(Math.log10(a));
  let mantissa = fixed(v / 10 ** n, n - k);
  if (Math.abs(Number(mantissa)) >= 10) {
    n += 1;
    mantissa = fixed(v / 10 ** n, n - k);
  }
  return TEXT.scientific(trimZeros(mantissa), String(n));
}
