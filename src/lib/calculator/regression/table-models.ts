// The nine table regression models (RT-29, REG-MODELS-1 to -3): their ids and dropdown labels,
// parameter names, the model structure the ⋮ menu shows, the latex "Export as custom regression"
// writes, the displayed EQUATION template, how each one is evaluated, and which are linear in
// their parameters (solved directly) or log-linear (Log Mode). Pure TypeScript: no DOM.

export const TABLE_MODELS = [
  "linear",
  "quadratic",
  "cubic",
  "quartic",
  "exponential",
  "logarithmic",
  "power",
  "logistic",
  "sinusoidal",
] as const;
export type TableModel = (typeof TABLE_MODELS)[number];

/** RT-24: the log-linear form Log Mode refits on (ln y against x or ln x, or y against ln x). */
export type LogForm = "LOGLIN" | "LOGLOG" | "LINLOG";

export interface TableModelSpec {
  type: TableModel;
  label: string; // the dropdown option
  params: readonly string[];
  /** The ⋮ menu's REGRESSION MODEL STRUCTURE, as latex in plain x and y. */
  structure: string;
  /** Its spoken form after "Regression model structure: ". */
  structureSpeech: string;
  /** The custom regression latex for header names `x`, `y` and parameter names `p`. */
  template(x: string, y: string, p: readonly string[]): string;
  /** The EQUATION row latex for the formatted parameter values `v` (before the `+-` clean-up). */
  equation(v: readonly string[]): string;
  evaluate(p: ArrayLike<number>, x: number): number;
  /** Linear models: the design row at x (one entry per parameter). */
  basis?: (x: number) => number[];
  logForm?: LogForm;
}

const powers = (degree: number) => (x: number) =>
  Array.from({ length: degree + 1 }, (_, k) => x ** (degree - k));

const poly = (degree: number, names: readonly string[]) => ({
  structure: `y\\sim ${names
    .map((n, k) => {
      const d = degree - k;
      return d === 0 ? n : d === 1 ? `${n}x` : `${n}x^{${d}}`;
    })
    .join("+")}`,
  template: (x: string, y: string, p: readonly string[]) =>
    `${y}\\sim ${p
      .map((n, k) => {
        const d = degree - k;
        return d === 0 ? n : d === 1 ? `${n}${x}` : `${n}${x}^{${d}}`;
      })
      .join("+")}`,
  equation: (v: readonly string[]) =>
    `y=${v
      .map((n, k) => {
        const d = degree - k;
        return d === 0 ? n : d === 1 ? `${n}x` : `${n}x^{${d}}`;
      })
      .join("+")}`,
  evaluate: (p: ArrayLike<number>, x: number) => {
    let s = 0;
    for (let k = 0; k <= degree; k++) s += p[k] * x ** (degree - k);
    return s;
  },
  basis: powers(degree),
});

const ORDINALS: Record<number, string> = { 2: "squared", 3: "cubed", 4: "to the 4th power" };
const polySpeech = (names: readonly string[], degree: number) =>
  `"y" similar ${names
    .map((n, k) => {
      const d = degree - k;
      return d === 0 ? `"${n}"` : d === 1 ? `"${n}" "x"` : `"${n}" "x" ${ORDINALS[d]}`;
    })
    .join(" plus ")}`;

const LINEAR = ["m", "b"] as const;
const QUADRATIC = ["a", "b", "c"] as const;
const CUBIC = ["a", "b", "c", "d"] as const;
const QUARTIC = ["a", "b", "c", "d", "f"] as const; // REG-MODELS-3: no e

export const TABLE_MODEL_SPECS: Readonly<Record<TableModel, TableModelSpec>> = {
  linear: {
    type: "linear",
    label: "Linear Regression",
    params: LINEAR,
    structureSpeech: polySpeech(LINEAR, 1),
    ...poly(1, LINEAR),
  },
  quadratic: {
    type: "quadratic",
    label: "Quadratic Regression",
    params: QUADRATIC,
    structureSpeech: polySpeech(QUADRATIC, 2),
    ...poly(2, QUADRATIC),
  },
  cubic: {
    type: "cubic",
    label: "Cubic Regression",
    params: CUBIC,
    structureSpeech: polySpeech(CUBIC, 3),
    ...poly(3, CUBIC),
  },
  quartic: {
    type: "quartic",
    label: "Quartic Regression",
    params: QUARTIC,
    structureSpeech: polySpeech(QUARTIC, 4),
    ...poly(4, QUARTIC),
  },
  exponential: {
    type: "exponential",
    label: "Exponential Regression",
    params: ["a", "b"],
    structure: "y\\sim a\\cdot b^{x}",
    structureSpeech: `"y" similar "a" times "b" Superscript, "x" , Baseline`,
    template: (x, y, [a, b]) => `${y}\\sim ${a}\\cdot ${b}^{${x}}`,
    equation: ([a, b]) => `y=${a}\\cdot${b}^{x}`,
    evaluate: (p, x) => p[0] * p[1] ** x,
    logForm: "LOGLIN",
  },
  logarithmic: {
    type: "logarithmic",
    label: "Logarithmic Regression",
    params: ["a", "b"],
    structure: "y\\sim a+b\\cdot\\ln\\left(x\\right)",
    structureSpeech: `"y" similar "a" plus "b" times natural log left parenthesis "x" right parenthesis`,
    template: (x, y, [a, b]) => `${y}\\sim ${a}+${b}\\cdot\\ln\\left(${x}\\right)`,
    equation: ([a, b]) => `y=${a}+${b}\\cdot\\ln\\left(x\\right)`,
    evaluate: (p, x) => p[0] + p[1] * Math.log(x),
    basis: (x) => [1, Math.log(x)],
    logForm: "LINLOG",
  },
  power: {
    type: "power",
    label: "Power Regression",
    params: ["a", "b"],
    structure: "y\\sim a\\cdot x^{b}",
    structureSpeech: `"y" similar "a" times "x" Superscript, "b" , Baseline`,
    template: (x, y, [a, b]) => `${y}\\sim ${a}\\cdot ${x}^{${b}}`,
    equation: ([a, b]) => `y=${a}\\cdot x^{${b}}`,
    evaluate: (p, x) => p[0] * realPower(x, p[1]),
    logForm: "LOGLOG",
  },
  logistic: {
    type: "logistic",
    label: "Logistic Regression",
    params: ["a", "b", "c"],
    structure: "y\\sim\\frac{a}{1+e^{-\\left(bx+c\\right)}}",
    structureSpeech: `"y" similar StartFraction "a" Over 1 plus "e" Superscript, negative left parenthesis "b" "x" plus "c" right parenthesis , Baseline EndFraction`,
    template: (x, y, [a, b, c]) => `${y}\\sim\\frac{${a}}{1+e^{-\\left(${b}${x}+${c}\\right)}}`,
    equation: ([a, b, c]) => `y=\\frac{${a}}{1+e^{-\\left(${b}x+${c}\\right)}}`,
    evaluate: (p, x) => p[0] / (1 + Math.exp(-(p[1] * x + p[2]))),
  },
  sinusoidal: {
    type: "sinusoidal",
    label: "Sinusoidal Regression",
    params: ["a", "b", "c", "d"],
    structure: "y\\sim a\\cdot\\sin\\left(bx+c\\right)+d",
    structureSpeech: `"y" similar "a" times sine left parenthesis "b" "x" plus "c" right parenthesis plus "d"`,
    template: (x, y, [a, b, c, d]) => `${y}\\sim ${a}\\cdot\\sin\\left(${b}${x}+${c}\\right)+${d}`,
    equation: ([a, b, c, d]) => `y=${a}\\cdot\\sin\\left(${b}x+${c}\\right)+${d}`,
    evaluate: (p, x) => p[0] * Math.sin(p[1] * x + p[2]) + p[3],
  },
};

export const isTableModel = (v: unknown): v is TableModel =>
  typeof v === "string" && (TABLE_MODELS as readonly string[]).includes(v);

/**
 * x^b as the calculator's real power does it (REG-MODELS-19): a negative base with an exponent
 * that is a fraction of odd denominator is real ((−2)^1.84 = 2^1.84), otherwise NaN.
 */
export function realPower(x: number, b: number): number {
  if (x >= 0 || Number.isInteger(b)) return x ** b;
  for (let q = 3; q <= 999; q += 2) {
    const p = Math.round(b * q);
    if (Math.abs(p / q - b) <= 1e-12 * Math.max(1, Math.abs(b))) {
      const magnitude = (-x) ** b;
      return p % 2 === 0 ? magnitude : -magnitude;
    }
  }
  return NaN;
}
