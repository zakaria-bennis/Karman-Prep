// Name resolution across rows (RC-6 to RC-10, RC-20): which names some row defines, which names
// are defined twice, which rows form cycles, the dependency order of the defining rows and which
// coordinates a tree reaches through definitions. Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import { sourceChildren, type Node } from "../latex/ast";
import { declaredHead, type DefinitionHead, type ParsedRow } from "./definitions";
import { displayName } from "./messages";
import { collectNameUses, COORDINATE_NAMES } from "./names";

/** Why a name cannot be used: its error code and the display names its message shows. */
export interface Blocked {
  code: RowErrorCode;
  names: string[];
}
export interface Resolution {
  isDefined(name: string): boolean;
  baseCaseRecursion: ReadonlySet<string>; // recursive functions with an `n=c` base case: not graphed
  isFunction(name: string): boolean; // some row's head, with or without an error, defines a function of that name
  coordinatesOf(tree: Node, locals: readonly string[]): ReadonlySet<string>; // ⊆ COORDINATE_NAMES, through definitions
  duplicates: ReadonlySet<string>; // names with two or more error-free heads
  cycles: ReadonlyMap<string, Blocked>; // each row id in a cycle and the cycle's error
  blocked: ReadonlyMap<string, Blocked>; // names a row cannot use: duplicated, cyclic, or defined through one
  valueOrder: string[]; // error-free defining rows, dependencies first, ties in list order
  functionArity(name: string): number | null; // a unique, acyclic, error-free function head's parameter count
}

/** An error-free defining row: its id and head. */
interface DefiningRow {
  id: string;
  head: DefinitionHead;
}

/** The rows of a non-duplicated name, and per row the rows its body uses, in list order. */
interface DependencyGraph {
  rows: DefiningRow[];
  edges: number[][];
}

/**
 * Every head defines its name, with or without an error (RC-10). A name with two or more
 * error-free heads is duplicated (RC-7). The other error-free heads form the dependency graph:
 * its cycles (RC-8) and, from the rest, the order values resolve in, whatever the row order
 * (RC-9). Coordinates pass through the bodies of error-free heads only, each with its parameters
 * as locals (RC-4); cycles are safe.
 */
export function resolveDefinitions(rows: readonly ParsedRow[]): Resolution {
  const declared = rows.flatMap((row) => declaredHead(row) ?? []);
  const defined = new Set(declared.map((head) => head.name));
  const functionNames = new Set(declared.flatMap((h) => (h.type === "function" ? h.name : [])));
  const heads: DefiningRow[] = rows.flatMap((row) =>
    row.head !== null && row.error === null && row.head.anonymous !== true
      ? [{ id: row.source.id, head: row.head }]
      : []
  );
  const duplicates = repeatedNames(heads.map(({ head }) => head.name)),
    graph = dependencyGraph(heads.filter(({ head }) => !duplicates.has(head.name))),
    cycles = cycleErrors(graph),
    baseCaseRecursion = equalityBaseCases(graph),
    cyclicRows = new Set(cycles.keys());
  const arity = new Map(
    graph.rows.flatMap(({ id, head }) =>
      head.type === "function" && !cyclicRows.has(id)
        ? [[head.name, head.params.length] as const]
        : []
    )
  );
  const reached = reachedCoordinates(heads.map(({ head }) => head));
  return {
    isDefined: (name) => defined.has(name),
    isFunction: (name) => functionNames.has(name),
    baseCaseRecursion,
    coordinatesOf(tree, locals) {
      const found = new Set<string>();
      for (const { name, counted } of collectNameUses(tree)) {
        if (locals.includes(name) || counted) continue;
        if (COORDINATE_NAMES.includes(name)) found.add(name);
        else for (const coordinate of reached.get(name) ?? []) found.add(coordinate);
      }
      return found;
    },
    duplicates,
    cycles,
    blocked: blockedNames(graph, duplicates, cycles),
    valueOrder: postOrder(graph).filter((id) => !cyclicRows.has(id)),
    functionArity: (name) => arity.get(name) ?? null,
  };
}

/** RC-7: the names that appear two or more times. */
function repeatedNames(names: readonly string[]): Set<string> {
  return new Set(names.filter((name, k) => names.indexOf(name) !== k));
}

/**
 * An edge from each row to every row defining a name its body uses, parameters excluded; the
 * targets of each row are in list order, without repeats.
 */
function dependencyGraph(rows: DefiningRow[]): DependencyGraph {
  const byName = new Map(rows.map(({ head }, k) => [head.name, k]));
  const edges = rows.map(({ head }) => {
    const targets = new Set<number>();
    for (const { name } of collectNameUses(head.body)) {
      const target = head.params.includes(name) ? undefined : byName.get(name);
      if (target !== undefined) targets.add(target);
    }
    return [...targets].sort((a, b) => a - b);
  });
  return { rows, edges };
}

/**
 * RC-8 by Tarjan's strongly connected components: a component of two or more rows, or a row
 * whose body uses its own name, is a cycle; each holds the indices of its rows in list order.
 */
function components({ rows, edges }: DependencyGraph): number[][] {
  const order = rows.map(() => -1),
    low = rows.map(() => -1),
    onStack = rows.map(() => false),
    stack: number[] = [],
    found: number[][] = [];
  let next = 0;
  const visit = (v: number): void => {
    order[v] = low[v] = next;
    next += 1;
    stack.push(v);
    onStack[v] = true;
    for (const w of edges[v]) {
      if (order[w] === -1) {
        visit(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack[w]) low[v] = Math.min(low[v], order[w]);
    }
    if (low[v] !== order[v]) return;
    const component = stack.splice(stack.lastIndexOf(v));
    for (const w of component) onStack[w] = false;
    if (component.length > 1 || edges[v].includes(v)) found.push(component.sort((a, b) => a - b));
  };
  rows.forEach((_, v) => {
    if (order[v] === -1) visit(v);
  });
  return found;
}

/**
 * RC-8 with Desmos's texts (captured 2026-10-20), for every row of each cycle. A cycle of values,
 * or of values and functions, names its members alphabetically: "'a', 'b' and 'c' can't be
 * defined in terms of each other.". A cycle of functions names them as Desmos's depth-first walk
 * meets them, from the cycle's first row in list order around to that row last ("The definitions
 * of functions 'g', 'h' and 'f' depend on each other."), and adds its base-case hint when a call
 * around the cycle passes anything but the caller's own parameters, as a recursion would
 * (`f(x)=f(x-1)`).
 */
function cycleErrors(graph: DependencyGraph): Map<string, Blocked> {
  const errors = new Map<string, Blocked>();
  for (const component of components(graph)) {
    const members = component.map((v) => graph.rows[v]);
    if (isRecursion(members.map(({ head }) => head))) continue;
    const error: Blocked = members.every(({ head }) => head.type === "function")
      ? functionCycle(graph, component)
      : {
          code: "cycle",
          names: members
            .map(({ head }) => displayName(head.name))
            .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        };
    for (const { id } of members) errors.set(id, error);
  }
  return errors;
}

/**
 * Desmos's recursion (captured 2026-10-20): functions that call each other are a recursion, not a
 * cycle error, when one of them can return without calling the group, through a piecewise branch
 * (`f(n)=\{n=0:1,nf(n-1)\}`, Fibonacci, Ackermann). A group that calls itself on every path
 * (`f(x)=f(x-1)`) stays an error, as does any cycle through a value.
 */
function isRecursion(heads: readonly DefinitionHead[]): boolean {
  if (!heads.every((head) => head.type === "function")) return false;
  const names = new Set(heads.map((head) => head.name));
  return heads.some((head) => !alwaysCalls(head.body, names));
}

/**
 * The functions of each recursion whose base case is an equation (`f(n)=\{n=0:1,nf(n-1)\}`):
 * Desmos does not graph their rows (captured 2026-10-20), as they are defined at whole numbers.
 */
function equalityBaseCases(graph: DependencyGraph): Set<string> {
  const found = new Set<string>();
  for (const component of components(graph)) {
    const heads = component.map((v) => graph.rows[v].head);
    if (!isRecursion(heads)) continue;
    const equation = heads.some((head) => {
      const pending: Node[] = [head.body];
      for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
        if (node.kind === "piecewise" && node.branches.some((b) => b.cond.ops.includes("="))) {
          return true;
        }
        pending.push(...sourceChildren(node));
      }
      return false;
    });
    if (equation) for (const head of heads) found.add(head.name);
  }
  return found;
}

/** True when every evaluation of `node` calls one of `names`. */
function alwaysCalls(node: Node, names: ReadonlySet<string>): boolean {
  if (node.kind === "call" && names.has(node.name)) return true;
  if (node.kind === "piecewise") {
    if (node.branches.length > 0 && alwaysCalls(node.branches[0].cond, names)) return true;
    const values = [...node.branches.map((b) => b.value), node.otherwise];
    return values.every((value) => value !== null && alwaysCalls(value, names));
  }
  return sourceChildren(node).some((child) => alwaysCalls(child, names));
}

function functionCycle(graph: DependencyGraph, component: number[]): Blocked {
  const inside = new Set(component);
  const path: number[] = [];
  const walk = (v: number): number[] | null => {
    path.push(v);
    for (const w of graph.edges[v]) {
      if (!inside.has(w)) continue;
      const k = path.indexOf(w);
      if (k >= 0) return path.slice(k);
      const found = walk(w);
      if (found !== null) return found;
    }
    path.pop();
    return null;
  };
  const cycle = walk(component[0]) ?? component;
  const order = [...cycle.slice(1), cycle[0]].map((v) => displayName(graph.rows[v].head.name));
  const names = new Set(component.map((v) => graph.rows[v].head.name));
  const recursive = component.some((v) => passesOtherArguments(graph.rows[v].head, names));
  return { code: recursive ? "recursive-cycle" : "function-cycle", names: order };
}

/** True when `head`'s body calls one of `names` with anything but its own parameters in order. */
function passesOtherArguments(head: DefinitionHead, names: ReadonlySet<string>): boolean {
  const pending: Node[] = [head.body];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.kind === "call" && names.has(node.name)) {
      const same =
        node.args.length === head.params.length &&
        node.args.every((arg, k) => arg.kind === "id" && arg.name === head.params[k]);
      if (!same) return true;
    }
    pending.push(...sourceChildren(node));
  }
  return false;
}

/**
 * The names a row cannot use, each with the error its use shows: a duplicated name its
 * duplicate-definition error, a cyclic one its cycle's error, and a name whose definition uses
 * one of those the same error, through any chain of definitions (Desmos, 2026-10-20).
 */
function blockedNames(
  graph: DependencyGraph,
  duplicates: ReadonlySet<string>,
  cycles: ReadonlyMap<string, Blocked>
): Map<string, Blocked> {
  const blocked = new Map<string, Blocked>();
  for (const name of duplicates) {
    blocked.set(name, { code: "duplicate-definition", names: [displayName(name)] });
  }
  for (const { id, head } of graph.rows) {
    const error = cycles.get(id);
    if (error !== undefined) blocked.set(head.name, error);
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const { head } of graph.rows) {
      if (blocked.has(head.name)) continue;
      const use = collectNameUses(head.body).find(
        ({ name }) => !head.params.includes(name) && blocked.has(name)
      );
      if (use === undefined) continue;
      blocked.set(head.name, blocked.get(use.name)!);
      changed = true;
    }
  }
  return blocked;
}

/** RC-9: depth-first post-order from the rows in list order, so dependencies come first. */
function postOrder({ rows, edges }: DependencyGraph): string[] {
  const seen = rows.map(() => false),
    ids: string[] = [];
  const visit = (v: number): void => {
    if (seen[v]) return;
    seen[v] = true;
    for (const w of edges[v]) visit(w);
    ids.push(rows[v].id);
  };
  rows.forEach((_, v) => visit(v));
  return ids;
}

/**
 * The coordinates each defined name reaches through its bodies and the names they use, memoised
 * per name. Computed to a fixed point, so a cycle (RC-8) neither recurses nor loses coordinates.
 */
function reachedCoordinates(heads: readonly DefinitionHead[]): Map<string, Set<string>> {
  const reached = new Map<string, Set<string>>(),
    refs = new Map<string, Set<string>>();
  for (const head of heads) {
    const own = reached.get(head.name) ?? new Set<string>(),
      used = refs.get(head.name) ?? new Set<string>();
    for (const { name, counted } of collectNameUses(head.body)) {
      if (head.params.includes(name) || counted) continue;
      if (COORDINATE_NAMES.includes(name)) own.add(name);
      else used.add(name);
    }
    reached.set(head.name, own);
    refs.set(head.name, used);
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const [name, own] of reached)
      for (const ref of refs.get(name) ?? [])
        for (const coordinate of reached.get(ref) ?? [])
          if (!own.has(coordinate)) {
            own.add(coordinate);
            changed = true;
          }
  }
  return reached;
}
