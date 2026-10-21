// One regression in the values pass (D-22, D-24, D-33, D-46): L and the predictor lists read from
// the scope, the model compiled once and evaluated with the parameters and each list's element
// bound per observation, then fitRegression. evaluateRows puts the fitted parameters and the
// residual list e_k (regressionValues) into the scope for every later row; a failed fit leaves
// them undefined. Pure TypeScript.

import type { Deadline } from "../deadline";
import { compileExpression, type CompileScope } from "../eval/compile";
import { numberValue, type Value } from "../eval/values";
import { fitRegression, type RegressionResult } from "../../regression/fit";
import { rowErrorMessage } from "../analysis/messages";
import type { RegressionAnalysis } from "./regression-analysis";

export interface RegressionOutcome extends RegressionResult {
  residualName: string; // e_k
}

const real = (v: Value | undefined): number =>
  v !== undefined && v.type === "number" && Number.isFinite(v.value) ? v.value : NaN;

const listOf = (v: Value | undefined): number[] | null =>
  v !== undefined && v.type === "list" ? v.value.map((item) => real(item)) : null;

/** D-22: the error a regression shows in place of results. */
const failed = (r: RegressionAnalysis, error: string | null): RegressionOutcome => ({
  ok: false,
  error,
  params: [],
  r2: null,
  r: null,
  rmse: null,
  residuals: [],
  logMode: { available: false, on: false },
  approximate: false,
  isLinear: true,
  residualName: r.residual,
});

/**
 * D-22: how the reference names a side's type in "Cannot regress a point against a number.", and
 * whether that type cannot be regressed (a point, a list of points or an empty list); null for a
 * type it does not name.
 */
function sideType(v: Value | undefined): { phrase: string; bad: boolean } | null {
  if (v === undefined || v.type === "number" || v.type === "undefined")
    return { phrase: "a number", bad: false };
  if (v.type === "point") return { phrase: "a point", bad: true };
  if (v.type !== "list") return null;
  if (v.value.length === 0) return { phrase: "an empty list", bad: true };
  if (v.value.every((item) => item.type === "point"))
    return { phrase: "a list of points", bad: true };
  return { phrase: "a list of numbers", bad: false };
}

/** The model's value with every parameter 1 and every predictor its whole list, for its type. */
function modelValue(
  r: RegressionAnalysis,
  scope: CompileScope,
  deadline: Deadline
): Value | undefined {
  try {
    const vars: Record<string, Value> = {};
    for (const name of r.params) vars[name] = numberValue(1);
    for (const name of r.predictors) {
      const list = scope.values.get(name);
      if (list !== undefined) vars[name] = list;
    }
    return compileExpression(r.model, scope)(vars, deadline);
  } catch {
    return undefined;
  }
}

/** Fits `r` against the values in `scope`. */
export function evaluateRegression(
  r: RegressionAnalysis,
  scope: CompileScope,
  deadline: Deadline
): RegressionOutcome {
  const left = compileExpression(r.observed, scope)({}, deadline);
  const lists = r.predictors.map((name) => listOf(scope.values.get(name)) ?? []);
  const leftType = sideType(left);
  const rightType = sideType(modelValue(r, scope, deadline));
  if (leftType !== null && rightType !== null && (leftType.bad || rightType.bad)) {
    return failed(r, `Can't regress ${leftType.phrase} against ${rightType.phrase}.`);
  }
  // RT-15: a scalar left side is legal, fitted against every predictor value.
  const scalar = left.type === "number" || left.type === "undefined";
  const pairs = lists.length === 0 ? 1 : Math.min(...lists.map((l) => l.length));
  const observed = scalar ? new Array<number>(pairs).fill(real(left)) : listOf(left);
  if (observed === null) return failed(r, rowErrorMessage("regression-data", []));
  // Desmos fits nothing and shows no error when there is nothing to fit: no parameter
  // (`[1,2]\sim[3,4]`) or no defined observation (`y_{5}\sim mx_{5}+b`, captured 2026-10-20)
  if (r.params.length === 0 || !observed.some(Number.isFinite)) return failed(r, null);
  const compiled = compileExpression(r.model, scope);
  const vars: Record<string, Value> = {};
  const model = (p: Float64Array, i: number): number => {
    deadline.check();
    r.params.forEach((name, j) => (vars[name] = numberValue(p[j])));
    r.predictors.forEach((name, j) => (vars[name] = numberValue(lists[j][i] ?? NaN)));
    return real(compiled(vars, deadline));
  };
  const result = fitRegression({
    observed,
    // A model with no predictor list (y₁ ~ m) still pairs every observation (D-34).
    predictor: lists[0] ?? observed.map(() => 0),
    others: lists.slice(1),
    params: r.params,
    model,
    logForm: r.logForm,
    logMode: r.logMode,
    plainLeft: r.observed.kind === "id",
    uniquePredictor: r.predictors.length === 1,
  });
  return { ...result, residualName: r.residual };
}

/** D-22, D-33: the names a successful fit defines, its parameters and its residual list. */
export function regressionValues(outcome: RegressionOutcome): [string, Value][] {
  if (!outcome.ok) return [];
  return [
    ...outcome.params.map(({ name, value }): [string, Value] => [name, numberValue(value)]),
    [outcome.residualName, { type: "list", value: outcome.residuals.map((e) => numberValue(e)) }],
  ];
}
