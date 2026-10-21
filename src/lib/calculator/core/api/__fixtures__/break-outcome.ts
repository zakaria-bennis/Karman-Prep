// Test-only: one row's outcome in a form that both live Desmos (Calc.expressionAnalysis plus the
// row's spoken value) and this engine (expressionAnalysis plus the row's valueText) reduce to, so
// the adversarial corpus (break-corpus.json) can compare them. Never imported by production code.

import type { ApiEvaluation, ExpressionAnalysis } from "../types";

/** A shown value: a number, "undef", a list, a complex number, or the numbers in its text. */
export type OutcomeValue =
  | number
  | "undef"
  | (number | "undef")[]
  | { re: number; im: number }
  | { text: (number | "undef")[] };

/** An error's text, or whether the row graphs and the value it shows (when it shows one). */
export type Outcome = { error: string } | { graph: boolean; shown: false } | Shown;
interface Shown {
  graph: boolean;
  shown: true;
  value?: OutcomeValue;
}

const finite = (v: number): number | "undef" => (Number.isFinite(v) ? v : "undef");

/** The numbers and "undefined"s in a value's text, Desmos's spoken form or this engine's. */
export function textNumbers(text: string): (number | "undef")[] {
  const t = text
    .replace(/(\d) (?=\d)/g, "$1") // Desmos speaks long numbers digit by digit
    .replace(/negative |−/g, "-")
    .replace(/(\d)\s*(?:times 10 to the|×10\^)\s*\{?(-?\d+)\}?( power)?/g, "$1e$2");
  const found = t.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?|undefined/g) ?? [];
  return found.map((s) => (s === "undefined" ? "undef" : Number(s)));
}

/** This engine's evaluation as an outcome value; points and other values by their text. */
export function engineValue(evaluation: ApiEvaluation, text: string | null): OutcomeValue {
  switch (evaluation.type) {
    case "number":
      return finite(evaluation.value);
    case "undefined":
      return "undef";
    case "list":
      return evaluation.value.map(finite);
    case "complex": {
      const { re, im } = evaluation.value;
      return im === 0 ? finite(re) : { re, im };
    }
    default:
      return { text: textNumbers(text ?? "") };
  }
}

export function engineOutcome(a: ExpressionAnalysis, text: string | null): Outcome {
  if (a.isError) return { error: a.errorMessage ?? "" };
  if (!a.evaluationDisplayed || a.evaluation === undefined)
    return { graph: a.isGraphable, shown: false };
  return { graph: a.isGraphable, shown: true, value: engineValue(a.evaluation, text) };
}

const close = (a: number | "undef", b: number | "undef"): boolean =>
  typeof a === "number" && typeof b === "number"
    ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
    : a === b;
/** Text numbers are compared to the digits Desmos shows (about 10). */
const closeText = (a: number | "undef", b: number | "undef"): boolean =>
  typeof a === "number" && typeof b === "number"
    ? Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))
    : a === b;

function sameValue(a: OutcomeValue, b: OutcomeValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => close(v, b[i]))
    );
  }
  if (typeof a === "object" && "text" in a) {
    const t =
      typeof b === "object" && "text" in b ? b.text : typeof b === "object" ? [b.re, b.im] : [b];
    return t.length === a.text.length && a.text.every((v, i) => closeText(v, t[i]));
  }
  if (typeof b === "object" && "text" in b) return sameValue(b, a);
  if (typeof a === "object" || typeof b === "object") {
    return (
      typeof a === "object" &&
      typeof b === "object" &&
      "re" in a &&
      "re" in b &&
      close(a.re, b.re) &&
      close(a.im, b.im)
    );
  }
  return close(a, b);
}

/** True when two outcomes agree: the same error text, or the same graphing, showing and value. */
export function sameOutcome(a: Outcome, b: Outcome): boolean {
  if ("error" in a || "error" in b) return "error" in a && "error" in b && a.error === b.error;
  if (a.graph !== b.graph || a.shown !== b.shown) return false;
  if (!a.shown || !b.shown || a.value === undefined || b.value === undefined) return true;
  return sameValue(a.value, b.value);
}
