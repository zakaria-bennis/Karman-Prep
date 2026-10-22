// Regression rows in analysis (D-2, D-22, D-33, D-44; appendix F decisions): each row `L ~ M`
// fits the names of L and M that nothing else defines (its parameters, 0 to 8, in order of
// appearance, L first: `[d,c]\sim[b,a]` fits d, c, b, a, live 2026-10-22)
// and defines them, with its residual list e_k (the lowest k free in row order), through synthetic
// definition rows that depend on every list the fit reads, so other rows can use them and the
// values pass fits each regression before anything that uses its names. Pure TypeScript.

import type { RowErrorCode } from "../corpus/types";
import { sourceChildren, type Node } from "../latex/ast";
import type { DefinitionHead, ParsedRow } from "../analysis/definitions";
import type { AnalysisSettings, RowError } from "../analysis/index";
import { rowErrorMessage } from "../analysis/messages";
import { collectNameUses, isReservedName } from "../analysis/names";
import { SHAPE_NAMES } from "../analysis/lists";
import { matchLogForm } from "../../regression/log-forms";
import type { LogFormMatch } from "../../regression/fit";

export const MAX_REGRESSION_PARAMS = 8;

export interface RegressionAnalysis {
  rowId: string;
  observed: Node; // L
  model: Node; // M
  params: string[]; // the fitted names, in order of appearance in L then M
  leftParams: boolean; // L reads a parameter: the fit minimises L − M as a whole (list-fit.ts)
  reads: string[]; // every other name the fit reads, through the bodies of the functions it calls
  predictors: string[]; // the lists M reads, in order; the first is the curve's x (D-36)
  residual: string; // e_k (D-33)
  logForm: LogFormMatch | null; // D-27
  logMode: boolean; // the row's checkbox (D-30)
}
export interface RegressionPlan {
  analysis: RegressionAnalysis | null;
  error: RowError | null;
}

const ZERO = { start: 0, end: 0 };
const error = (code: RowErrorCode, names: string[] = []): RowError => ({
  code,
  message: rowErrorMessage(code, names),
  names,
  span: null,
});
const unique = (names: readonly string[]) => [...new Set(names)];

/** The synthetic definition id of `name` fitted by regression row `rowId`. */
export const regressionDefinitionId = (rowId: string, name: string) => `${rowId}#~${name}`;
/** The regression row a synthetic definition id belongs to, or null. */
export function regressionOf(id: string): string | null {
  const at = id.indexOf("#~");
  return at < 0 ? null : id.slice(0, at);
}

/**
 * The plan of every regression row in `parsed`: `defined` holds the names expression rows and
 * table data columns define, `lists` the list names tables define. Residual names come first, in
 * row order, so a later regression's model can read an earlier one's residuals.
 */
export function planRegressions(
  parsed: readonly ParsedRow[],
  defined: ReadonlySet<string>,
  lists: ReadonlySet<string>,
  settings: AnalysisSettings
): Map<string, RegressionPlan> {
  const rows = parsed.filter((r) => r.error === null && r.tree?.kind === "sim");
  // RT-25: a table regression's stored residual name is held too.
  const taken = new Set([
    ...defined,
    ...parsed.flatMap(
      (r) => (r.source as { regression?: { residual?: string } }).regression?.residual ?? []
    ),
  ]);
  const residuals = new Map<string, string>();
  for (const row of rows) {
    const name = residualFor(row.tree as Extract<Node, { kind: "sim" }>, taken);
    taken.add(name);
    residuals.set(row.source.id, name);
  }
  const allLists = new Set([...lists, ...residuals.values()]);
  const functions = new Map<string, DefinitionHead>();
  for (const row of parsed) {
    if (row.error === null && row.head?.type === "function" && row.head.anonymous !== true)
      functions.set(row.head.name, row.head);
  }
  const namesOf = (tree: Node) => namesThrough(tree, functions);
  const plans = new Map<string, RegressionPlan>();
  for (const row of rows) {
    const tree = row.tree as Extract<Node, { kind: "sim" }>;
    const leftNames = namesOf(tree.left),
      rightNames = namesOf(tree.right);
    const names = unique([...leftNames, ...rightNames]);
    // The first of x and y the row reads, left side first, is named (`y\sim x` names y, live
    // 2026-10-20; `[x,1]\sim[a,2]` names x, 2026-10-22).
    const coordinate = names.find((n) => n === "x" || n === "y");
    if (coordinate !== undefined) {
      plans.set(row.source.id, {
        analysis: null,
        error: error("regression-predictor", [coordinate]),
      });
      continue;
    }
    // The polar r is an ordinary parameter here (`y_1\sim a(1+r)^{x_1}`, live 2026-10-22).
    const free = (n: string) =>
      (n === "r" || !isReservedName(n, settings)) && !defined.has(n) && !allLists.has(n);
    const params = names.filter(free);
    if (params.length > MAX_REGRESSION_PARAMS) {
      plans.set(row.source.id, { analysis: null, error: error("regression-params") });
      continue;
    }
    // A parameter is a number, so indexing one is Desmos's type error (`[1,2]\sim m[3,4]`).
    const indexed = indexedParam(tree, free);
    if (indexed !== null) {
      plans.set(row.source.id, { analysis: null, error: error("index-type", indexed) });
      continue;
    }
    const predictors = rightNames.filter((n) => allLists.has(n));
    plans.set(row.source.id, {
      error: null,
      analysis: {
        rowId: row.source.id,
        observed: tree.left,
        model: tree.right,
        params,
        leftParams: leftNames.some(free),
        reads: names.filter((n) => !free(n) && !functions.has(n) && n !== "x" && n !== "y"),
        predictors,
        residual: residuals.get(row.source.id)!,
        logForm: predictors.length === 0 ? null : matchLogForm(tree.right, params, predictors[0]),
        logMode: row.source.logMode === true,
      },
    });
  }
  return plans;
}

/** Whether `tree` indexes or filters a list (`mx_1[x_1>2]`), which one observation cannot do. */
export function hasIndex(tree: Node): boolean {
  return tree.kind === "index" || sourceChildren(tree).some(hasIndex);
}

/** Whether `tree` reads a member of `name`, `Q.x` (`Q.y\sim mQ.x+b` does not graph, 2026-10-20). */
function readsMember(tree: Node, name: string): boolean {
  if (tree.kind === "call" && tree.member !== undefined && tree.args[0]?.kind === "id")
    if (tree.args[0].name === name) return true;
  return sourceChildren(tree).some((child) => readsMember(child, name));
}

/** The index-type error names of the first `p[…]` in `tree` whose target is a parameter, or null. */
function indexedParam(tree: Node, isParam: (name: string) => boolean): string[] | null {
  const pending: Node[] = [tree];
  for (let node = pending.shift(); node !== undefined; node = pending.shift()) {
    if (node.kind === "index" && node.target.kind === "id" && isParam(node.target.name)) {
      const [item] = node.items;
      const many =
        node.range !== undefined ||
        node.items.length > 1 ||
        item?.kind === "rel" ||
        item?.kind === "list";
      return [SHAPE_NAMES.number, SHAPE_NAMES[many ? "numbers" : "number"]];
    }
    pending.push(...sourceChildren(node));
  }
  return null;
}

/**
 * The names `tree` uses in order, each call of a user function followed by the names its body
 * uses other than its parameters (`[f(2),f(5)]\sim[7,16]` with f(x)=ax+b fits a and b, live
 * 2026-10-22). A function reached twice is expanded once.
 */
function namesThrough(tree: Node, functions: ReadonlyMap<string, DefinitionHead>): string[] {
  const out: string[] = [],
    seen = new Set<string>();
  const walk = (node: Node, local: ReadonlySet<string>) => {
    for (const { name } of collectNameUses(node)) {
      if (local.has(name)) continue;
      out.push(name);
      const fn = functions.get(name);
      if (fn === undefined || seen.has(name)) continue;
      seen.add(name);
      walk(fn.body, new Set(fn.params));
    }
  };
  walk(tree, new Set());
  return unique(out);
}

/**
 * RT-25 (REG-CUSTOM-12): e_<subscript> of each subscripted name the row reads, left side first in
 * order of appearance (`y_7\sim mx_4+b` → e_7; with e_1 held, `y_1\sim mx_5+b` → e_5), else the
 * lowest free e_k.
 */
function residualFor(tree: Extract<Node, { kind: "sim" }>, taken: ReadonlySet<string>): string {
  const names = unique(
    [tree.left, tree.right].flatMap((t) => collectNameUses(t).map((u) => u.name))
  );
  for (const name of names) {
    const sub = /^[a-zA-Z]+_\{?([0-9a-zA-Z]+)\}?$/.exec(name)?.[1];
    if (sub !== undefined && !taken.has(`e_{${sub}}`)) return `e_{${sub}}`;
  }
  let k = 1;
  while (taken.has(`e_{${k}}`)) k++;
  return `e_{${k}}`;
}

/**
 * The synthetic definitions `name = [every name the fit reads]` of one regression: one per
 * parameter and one for its residual list. Their bodies only order the values pass; the pass
 * fills their values from the fit (evaluateRows).
 */
export function regressionSyntheticRows(r: RegressionAnalysis): ParsedRow[] {
  const own = new Set([...r.params, r.residual]);
  // A called function is read through its body's names, so its own row can use the parameters.
  const body: Node = {
    kind: "list",
    items: r.reads.filter((n) => !own.has(n)).map((name) => ({ kind: "id", name, span: ZERO })),
    span: ZERO,
  };
  return [...r.params, r.residual].map((name) => {
    const head: DefinitionHead = { name, type: "value", params: [], body, span: ZERO };
    return {
      source: { id: regressionDefinitionId(r.rowId, name), latex: "", hidden: true },
      empty: false,
      tree: {
        kind: "rel",
        ops: ["="],
        operands: [{ kind: "id", name, span: ZERO }, body],
        span: ZERO,
      },
      error: null,
      head,
    };
  });
}

/**
 * D-36: the regression curve y = M with its first predictor read as x, or null when it has none,
 * M indexes a list (`mx_1[x_1>2]+b`) or reads a member of its predictor, or L is an expression of a parameter (`ky_1\sim mx_1+1` does not graph, live 2026-10-22).
 */
export function regressionCurve(r: RegressionAnalysis): Node | null {
  // a bare parameter on the left still graphs (`y_5\sim mx_5+b` with y_5 free, 2026-10-22)
  if (r.predictors.length !== 1 || hasIndex(r.model) || readsMember(r.model, r.predictors[0]))
    return null;
  if (r.leftParams && r.observed.kind !== "id") return null;
  const predictor = r.predictors[0];
  const walk = (n: Node): Node => {
    if (n.kind === "id") return n.name === predictor ? { ...n, name: "x" } : n;
    const copy: Record<string, unknown> = { ...n };
    for (const [key, value] of Object.entries(n)) {
      if (key === "span") continue;
      if (Array.isArray(value)) copy[key] = value.map((v) => walk(v as Node));
      else if (value !== null && typeof value === "object" && "kind" in value)
        copy[key] = walk(value as Node);
    }
    return copy as Node;
  };
  return walk(r.model);
}
