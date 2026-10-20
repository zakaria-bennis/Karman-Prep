// Regression number display (RT-21, RT-22, REG-MODELS-7, -8, REG-STATISTICS-17 to -19): the fit's
// display precision P, the typed-row parameter formatter, the table EQUATION formatter (rounded to
// max(T, P) significant digits, then printed with 12 digits, scientific values wrapped in
// \left(…\right)) and the statistic formatter (4 significant digits). All return LaTeX with a
// hyphen-minus; MathQuill draws it as "−". Pure TypeScript: no DOM.

const trim = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);

/** "1.23e+4" → `1.23\times10^{4}` with the mantissa trimmed. */
function scientific(v: number, mantissaDigits: number): string {
  const [m, e] = v.toExponential(Math.max(0, mantissaDigits - 1)).split("e");
  return `${trim(m)}\\times10^{${Number(e)}}`;
}

/** Plain decimal text of `v` with no exponent (|v| in [1e-6, 1e21)). */
function plain(v: number): string {
  const s = String(v);
  if (!/e/i.test(s)) return s;
  const digits = Math.max(0, Math.min(100, 20 - Math.floor(Math.log10(Math.abs(v)))));
  return trim(v.toFixed(digits));
}

/** T(v) of REG-MODELS-7: the significant digits a value gets before P is applied. */
export function valueDigits(v: number): number {
  const a = Math.abs(v);
  if (a <= 1 || a >= 1e9 || a < 1e-6) return 6;
  return Math.min(9, Math.floor(Math.log10(a)) + 1 + 5);
}

const roundTo = (v: number, digits: number) => Number(v.toPrecision(Math.min(100, digits)));

/**
 * REG-MODELS-8: the smallest s in 4..14 for which rounding every parameter to s significant
 * digits moves each model output at the data points by less than (y range)/500; 5 when none does.
 */
export function displayPrecision(
  params: readonly number[],
  xs: readonly number[],
  ys: readonly number[],
  evaluate: (p: ArrayLike<number>, x: number) => number
): number {
  if (ys.length === 0) return 5;
  let lo = Infinity,
    hi = -Infinity;
  for (const y of ys) {
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  const range = lo < 0 && hi > 0 ? hi - lo : Math.max(Math.abs(lo), Math.abs(hi));
  const tolerance = range / 500;
  const exact = xs.map((x) => evaluate(params, x));
  for (let s = 4; s <= 14; s++) {
    const rounded = params.map((p) => roundTo(p, s));
    const ok = xs.every((x, i) => Math.abs(evaluate(rounded, x) - exact[i]) < tolerance);
    if (ok) return s;
  }
  return 5;
}

/** RT-22.2: one EQUATION value as LaTeX. */
export function formatEquationValue(v: number, precision: number): string {
  if (!Number.isFinite(v)) return "\\mathrm{undefined}";
  const r = roundTo(v, Math.max(valueDigits(v), precision));
  if (r === 0) return "0";
  const a = Math.abs(r);
  if (a >= 1e-6 && a <= 1e9) return plain(roundTo(r, 12));
  const body = scientific(a, 11);
  return r < 0 ? `-\\left(${body}\\right)` : `\\left(${body}\\right)`;
}

/** RT-22.2: the displayed equation: the template with every value, and `+-` read as `-`. */
export function equationLatex(
  template: (values: readonly string[]) => string,
  params: readonly number[],
  precision: number
): string {
  return template(params.map((p) => formatEquationValue(p, precision))).replace(/\+-/g, "-");
}

/** RT-22.1: one typed-row parameter value as LaTeX. */
export function formatParameterValue(v: number, precision: number): string {
  if (!Number.isFinite(v)) return "\\mathrm{undefined}";
  const digits = Math.max(valueDigits(v), precision);
  const r = roundTo(v, digits);
  if (r === 0) return "0";
  const a = Math.abs(r);
  if (a >= 1e-6 && a < 1e9) return plain(r);
  return `${r < 0 ? "-" : ""}${scientific(a, digits)}`;
}

/** RT-22.3: a statistic (R², r, RMSE) as LaTeX. */
export function formatStatisticValue(v: number): string {
  if (!Number.isFinite(v)) return "\\mathrm{undefined}";
  const a = Math.abs(v);
  if (a < 1e-15) return "0";
  const sign = v < 0 ? "-" : "";
  if (a > 1e9 || a < 1e-6) return sign + scientific(a, 3);
  const r = roundTo(a, 4);
  if (r >= 1e4) return sign + scientific(a, 3);
  return sign + plain(r);
}

/** LaTeX → readable text: `\times10^{4}` → "×10⁴" style plain text for labels and tests. */
export function latexToText(latex: string): string {
  const sup: Record<string, string> = {
    "-": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return latex
    .replace(
      /\\times10\^\{(-?\d+)\}/g,
      (_, e: string) => `×10${[...e].map((c) => sup[c]).join("")}`
    )
    .replace(/\\mathrm\{undefined\}/g, "undefined")
    .replace(/-/g, "−");
}
