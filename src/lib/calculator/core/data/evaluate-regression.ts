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

/** D-22: the error a regression shows in place of results when L is not a list. */
const notData = (r: RegressionAnalysis): RegressionOutcome => ({
  ok: false,
  error: rowErrorMessage("regression-data", []),
  params: [],
  r2: null,
  r: null,
  rmse: null,
  residuals: [],
  logMode: { available: false, on: false },
  approximate: false,
  residualName: r.residual,
});

/** Fits `r` against the values in `scope`. */
export function evaluateRegression(
  r: RegressionAnalysis,
  scope: CompileScope,
  deadline: Deadline
): RegressionOutcome {
  const observed = listOf(compileExpression(r.observed, scope)({}, deadline));
  if (observed === null) return notData(r);
  const lists = r.predictors.map((name) => listOf(scope.values.get(name)) ?? []);
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
