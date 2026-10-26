// Whole-value regressions (live Desmos, 2026-10-22). When L reads a parameter
// (`[5\%\operatorname{of}a,b]\sim[b,2c]`), M is a list for one observation (`[1,2,3]\sim[a,2a,3a]`,
// `3\sim[a,2a]`), M indexes a list (`y_1[x_1>2]\sim mx_1[x_1>2]+b`) or a predictor holds points
// (`Q.y\sim mQ.x+b`), Desmos evaluates both sides whole, numbers broadcast and lists cut to the
// shortest, and minimises the sum of (L − M)². With parameters on the left the observed values are
// 0 and the model is M − L, so the residuals are still L − M and the statistic is RMSE; otherwise L
// is the data as usual. The multi-start search runs too (multi-start-fit.ts). Pure TypeScript.

import type { Deadline } from "../deadline";
import { compileExpression, type CompileScope } from "../eval/compile";
import { subV } from "../eval/ops";
import { differentiate } from "../eval/derivative";
import type { Node } from "../latex/ast";
import { numberValue, type Value } from "../eval/values";
import { exactOf, exactValue, literalValue } from "../eval/exact-values";
import type { Fraction } from "../lib/rational";
import { fitRegression, type RegressionResult } from "../../regression/fit";
import { hasIndex, type RegressionAnalysis } from "./regression-analysis";

const real = (v: Value | undefined): number =>
  v !== undefined && v.type === "number" && Number.isFinite(v.value) ? v.value : NaN;

/** A side's values: a number is broadcast (length null), a list read element by element. */
function elements(v: Value): { values: number[]; length: number | null } | null {
  if (v.type === "number" || v.type === "undefined") return { values: [real(v)], length: null };
  if (v.type !== "list") return null;
  return { values: v.value.map((item) => real(item)), length: v.value.length };
}

/** Whether `r` needs the whole-value fit: L reads a parameter or M is a list for one observation. */
export function needsListFit(
  r: RegressionAnalysis,
  scope: CompileScope,
  deadline: Deadline
): boolean {
  if (r.leftParams || hasIndex(r.model)) return true;
  // a list of points is read whole, through its members (`Q.y\sim mQ.x+b`, 2026-10-20)
  const numeric = (v: Value | undefined) =>
    v === undefined || v.type !== "list" || v.value.every((item) => item.type === "number");
  if (!r.predictors.every((name) => numeric(scope.values.get(name)))) return true;
  try {
    const vars: Record<string, Value> = {};
    for (const name of r.params) vars[name] = numberValue(1);
    for (const name of r.predictors) {
      const list = scope.values.get(name);
      vars[name] = list?.type === "list" && list.value.length > 0 ? list.value[0] : numberValue(1);
    }
    return compileExpression(r.model, scope)(vars, deadline).type === "list";
  } catch {
    return false;
  }
}

/** Fits `r` with both sides evaluated whole. */
export function fitWholeValues(
  r: RegressionAnalysis,
  scope: CompileScope,
  deadline: Deadline
): RegressionResult {
  const left = compileExpression(r.observed, scope),
    right = compileExpression(r.model, scope);
  const vars: Record<string, Value> = {};
  for (const name of r.predictors) {
    const list = scope.values.get(name);
    if (list !== undefined) vars[name] = list;
  }
  const sides = (p: ArrayLike<number>) => {
    r.params.forEach((name, j) => (vars[name] = numberValue(p[j])));
    return [left(vars, deadline), right(vars, deadline)].map(elements);
  };
  // The length is fixed by the shapes at the starting values (a parameter is never a list).
  const start = sides(new Float64Array(r.params.length).fill(1));
  const lengths = start.flatMap((s) => (s === null || s.length === null ? [] : [s.length]));
  const n = start.some((s) => s === null) ? 0 : lengths.length === 0 ? 1 : Math.min(...lengths);
  const at = (s: { values: number[]; length: number | null } | null, i: number) =>
    s === null ? NaN : s.length === null ? s.values[0] : (s.values[i] ?? NaN);
  // One evaluation of both sides per parameter vector; model(p, i) is called for i = 0..n-1.
  let key = "",
    cached: number[] = [];
  const values = (p: ArrayLike<number>): number[] => {
    const k = Array.prototype.join.call(p, ",");
    if (k !== key || cached.length === 0) {
      deadline.check();
      const [l, m] = sides(p);
      cached = Array.from({ length: n }, (_, i) => (r.leftParams ? at(m, i) - at(l, i) : at(m, i)));
      key = k;
    }
    return cached;
  };
  const gradient = derivatives(r, scope, deadline, vars, n, at);
  // Both sides in exact fractions (exact-values.ts), a list's untagged data read as typed.
  const exactModel = (p: readonly Fraction[]): (Fraction | null)[] => {
    deadline.check();
    const exactVars: Record<string, Value> = {};
    for (const [name, v] of Object.entries(vars)) {
      exactVars[name] =
        v.type === "list"
          ? {
              type: "list",
              value: v.value.map((e) =>
                e.type === "number" && exactOf(e) === null ? literalValue(e.value) : e
              ),
            }
          : v;
    }
    r.params.forEach((name, j) => (exactVars[name] = exactValue(p[j])));
    const [l, m] = [left(exactVars, deadline), right(exactVars, deadline)];
    const item = (v: Value, i: number) =>
      v.type === "list" ? (v.value[i] ?? null) : v.type === "number" ? v : null;
    return Array.from({ length: n }, (_, i) => {
      const [li, mi] = [item(l, i), item(m, i)];
      const fm = mi === null ? null : exactOf(mi);
      if (!r.leftParams) return fm;
      const fl = li === null ? null : exactOf(li);
      return fm === null || fl === null ? null : exactOf(subV(mi!, li!));
    });
  };
  const observed = r.leftParams
    ? new Array<number>(n).fill(0)
    : Array.from({ length: n }, (_, i) => at(start[0], i));
  return fitRegression({
    observed,
    predictor: new Array<number>(n).fill(0),
    params: r.params,
    model: (p, i) => values(p)[i],
    logForm: null,
    logMode: false,
    plainLeft: !r.leftParams && r.observed.kind === "id",
    uniquePredictor: false,
    multiStart: true,
    gradient: gradient ?? undefined,
    exactModel,
  });
}

type Elements = { values: number[]; length: number | null } | null;

/**
 * ∂(M − L)/∂p (∂M/∂p when L reads no parameter) at observation i, from the rows differentiated
 * symbolically, as live Desmos's search steps by them (2026-10-25); null when a node has no rule.
 */
function derivatives(
  r: RegressionAnalysis,
  scope: CompileScope,
  deadline: Deadline,
  vars: Record<string, Value>,
  n: number,
  at: (s: Elements, i: number) => number
): ((p: ArrayLike<number>, i: number) => number[]) | null {
  const lookup = (name: string) => scope.functions.get(name);
  const derive = (side: Node) =>
    r.params.map((name) => differentiate(side, name, lookup, scope.settings.angleMode));
  const dm = derive(r.model),
    dl = r.leftParams ? derive(r.observed) : [];
  if ([...dm, ...dl].some((d) => d === null)) return null;
  const compiled = (trees: (Node | null)[]) => trees.map((t) => compileExpression(t!, scope));
  const [cm, cl] = [compiled(dm), compiled(dl)];
  let key = "",
    cached: number[][] = [];
  return (p, i) => {
    const k = Array.prototype.join.call(p, ",");
    if (k !== key) {
      deadline.check();
      r.params.forEach((name, j) => (vars[name] = numberValue(p[j])));
      const m = cm.map((c) => elements(c(vars, deadline)));
      const l = cl.map((c) => elements(c(vars, deadline)));
      cached = Array.from({ length: n }, (_, row) =>
        r.params.map((_, j) => at(m[j], row) - (r.leftParams ? at(l[j], row) : 0))
      );
      key = k;
    }
    return cached[i];
  };
}
