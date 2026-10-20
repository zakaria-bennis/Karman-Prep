// Which rows are sliders (SLIDERS-1, SLIDERS-2) and what a slider row shows: its evaluated limits
// and their errors (SLIDERS-16 to SLIDERS-19), its range with soft limits (SLIDERS-20) and its
// snapped value (SLIDERS-22). Pure TypeScript: no DOM (AR-44).

import type { RowAnalysis } from "../core/analysis";
import { displayName } from "../core/analysis/messages";
import { NO_DEADLINE } from "../core/deadline";
import { compileExpression, type CompileScope } from "../core/eval/compile";
import { numberValue, type Value } from "../core/eval/values";
import { parseLatex } from "../core/latex";
import { sourceChildren, type Node } from "../core/latex/ast";
import type { SliderSettings } from "./model";
import { plainDecimal } from "./numbers";
import { snap, softMax, softMin, type SliderRange } from "./range";

/** The `name = literal` a slider row holds. */
export interface SliderTarget {
  name: string;
  typed: number;
}

/** SLIDERS-1: the right side after the first `=`: an optional sign and a plain decimal literal. */
const LITERAL = /^\s*[+-]?\s*(?:\d+\.?\d*|\.\d+)\s*(?:\\ \s*)*$/;
const SLIDER_KINDS = new Set(["definition", "vertical-lines", "horizontal-lines"]);

/**
 * SLIDERS-1, SLIDERS-2: the slider a row is, or null. The row must be `name = literal number`
 * with a finite value and no error: a value definition, or `x=3` / `y=3`, which also draw a line.
 */
export function sliderTarget(
  latex: string,
  analysis: RowAnalysis | undefined
): SliderTarget | null {
  if (analysis === undefined || analysis.error !== null || !SLIDER_KINDS.has(analysis.kind)) {
    return null;
  }
  const tree = analysis.tree;
  if (tree?.kind !== "rel" || tree.ops.length !== 1 || tree.ops[0] !== "=") return null;
  const [left, right] = tree.operands;
  if (left.kind !== "id") return null;
  const number = right.kind === "neg" ? right.arg : right;
  if (number.kind !== "num") return null;
  const at = latex.indexOf("=");
  if (at < 0 || !LITERAL.test(latex.slice(at + 1))) return null;
  const typed = right.kind === "neg" ? -number.value : number.value;
  return Number.isFinite(typed) ? { name: left.name, typed } : null;
}

type LimitField = "min" | "max" | "step";
interface Limit {
  value: number; // NaN when invalid
  invalid: boolean;
  self: boolean; // uses the slider's own name
  names: string[]; // names no slider defines
}

/** The names in `tree`, in source order (the order the error message lists them). */
function namesIn(tree: Node): string[] {
  const out: string[] = [];
  const pending = [tree];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.kind === "id" && !out.includes(node.name)) out.push(node.name);
    pending.push(...[...sourceChildren(node)].reverse());
  }
  return out;
}

/** SLIDERS-16: a limit's value; any expression of numbers and other sliders' names. */
function evaluateLimit(latex: string, name: string, known: ReadonlyMap<string, number>): Limit {
  const parsed = parseLatex(latex);
  if (!parsed.ok) return { value: NaN, invalid: true, self: false, names: [] };
  const used = namesIn(parsed.tree);
  const names = used.filter((n) => n !== name && !known.has(n));
  if (used.includes(name)) return { value: NaN, invalid: true, self: true, names };
  if (names.length > 0 || parsed.tree.kind === "rel") {
    return { value: NaN, invalid: true, self: false, names };
  }
  const values = new Map<string, Value>([...known].map(([n, v]) => [n, numberValue(v)]));
  const scope: CompileScope = {
    functions: new Map(),
    values,
    settings: { angleMode: "radians", complex: false },
  };
  let result: Value;
  try {
    result = compileExpression(parsed.tree, scope)({}, NO_DEADLINE);
  } catch {
    return { value: NaN, invalid: true, self: false, names: [] };
  }
  const value = result.type === "number" ? result.value : NaN;
  return { value, invalid: !Number.isFinite(value), self: false, names: [] };
}

export interface SliderView {
  name: string;
  typed: number; // the number in the row's latex
  value: number; // SLIDERS-22: the value the row shows and the graph uses
  range: SliderRange; // NaN limits while `error` is set
  settings: SliderSettings;
  invalid: Readonly<Record<LimitField, boolean>>; // SLIDERS-18: fields marked as errors
  error: string | null; // SLIDERS-18: the row's limit error
  limitNames: string[]; // SLIDERS-10: names in the limits that nothing defines, for chips
  disabled: boolean; // SLIDERS-14: min = max
}

const MESSAGES: Record<LimitField, string> = {
  min: "Invalid slider min. Try using any number.",
  max: "Invalid slider max. Try using any number.",
  step: "Invalid slider step. Try using any number.",
};
const ORDER_MESSAGE = "Invalid slider limits. Min should be less than max.";

/** The analysis's wording for names nothing defines: 'a', 'b' or 'c'. */
function tooManyVariables(names: string[]): string {
  if (names.length === 1) return `Too many variables. Try defining '${names[0]}'.`;
  const last = names[names.length - 1];
  return `Too many variables. Try defining '${names.slice(0, -1).join("', '")}' or '${last}'.`;
}

/**
 * SLIDERS-25, SLIDERS-29: a slider's name as its controls speak it: `\alpha` is alpha and
 * `a_{1}` is a_1 (the thumb is `"a"`, the Play button "Play alpha Animation").
 */
export function spokenName(name: string): string {
  const match = /^(.*?)_\{(.*)\}$/.exec(name);
  const [base, subscript] = match === null ? [name, null] : [match[1], match[2]];
  const letter = base.replace(/^\\/, "");
  return subscript === null ? letter : `${letter}_${subscript}`;
}

/**
 * A slider row's view from its target and settings; `known` maps other sliders' names to their
 * values, which limits may use. Limits are checked in the order min, max, step, then min > max.
 */
export function describeSlider(
  target: SliderTarget,
  settings: SliderSettings,
  known: ReadonlyMap<string, number>
): SliderView {
  const { name, typed } = target;
  const others = new Map([...known].filter(([n]) => n !== name));
  const none: Limit = { value: NaN, invalid: false, self: false, names: [] };
  const min = settings.hardMin ? evaluateLimit(settings.min, name, others) : none;
  const max = settings.hardMax ? evaluateLimit(settings.max, name, others) : none;
  const stepLimit = settings.step.trim() === "" ? none : evaluateLimit(settings.step, name, others);
  const step = stepLimit.invalid ? NaN : Math.abs(stepLimit.value) || 0; // SLIDERS-19
  const invalid = { min: min.invalid, max: max.invalid, step: stepLimit.invalid };
  const hardMin = settings.hardMin ? min.value : undefined;
  const hardMax = settings.hardMax ? max.value : undefined;
  const lo = hardMin ?? softMin(parseFloat(settings.min), typed, hardMax, step || 0);
  const hi = hardMax ?? softMax(parseFloat(settings.max), typed, hardMin, step || 0);
  let error: string | null = null;
  const self = [min, max, stepLimit].some((l) => l.self);
  const limitNames = [...min.names, ...max.names, ...stepLimit.names].filter(
    (n, i, all) => all.indexOf(n) === i
  );
  // A limit on the slider's own name next to a name nothing defines reads as the analysis's
  // "Too many variables" for the undefined names (Desmos, 2026-10-19: min b, max a).
  if (self && limitNames.length > 0) error = tooManyVariables(limitNames.map(displayName));
  else if (self)
    error = `Slider limits cannot depend on the slider variable '${displayName(name)}'.`;
  else if (min.invalid) error = MESSAGES.min;
  else if (max.invalid) error = MESSAGES.max;
  else if (stepLimit.invalid) error = MESSAGES.step;
  else if (lo > hi) {
    error = ORDER_MESSAGE;
    invalid.min = settings.hardMin;
    invalid.max = settings.hardMax;
  }
  const range: SliderRange = {
    min: error === null ? lo : NaN,
    max: error === null ? hi : NaN,
    step: Number.isFinite(step) ? step : 0,
    hardMin: settings.hardMin,
    hardMax: settings.hardMax,
  };
  const value =
    error === null ? snap({ target: typed, hardMin, hardMax, step: range.step }) : typed;
  return {
    name,
    typed,
    value,
    range,
    settings,
    invalid,
    error,
    limitNames,
    disabled: error === null && lo === hi,
  };
}

/** SLIDERS-3: `latex` with the text after the first `=` replaced by `value` as a plain decimal. */
export function withSliderValue(latex: string, value: number): string {
  if (!Number.isFinite(value)) return latex;
  const at = latex.indexOf("=") + 1;
  const current = Number(latex.slice(at).replace(/\\ /g, "").replace(/\s/g, ""));
  return current === value ? latex : latex.slice(0, at) + plainDecimal(value);
}
