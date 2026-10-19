// Name resolution across rows (RC-6 to RC-10, RC-20): which names some row defines, which names
// are defined twice, which rows form cycles, the dependency order of the defining rows and which
// coordinates a tree reaches through definitions. Pure TypeScript: no DOM (AR-44).

import type { Node } from "../latex/ast";
import { declaredHead, type DefinitionHead, type ParsedRow } from "./definitions";
import { collectNameUses, COORDINATE_NAMES } from "./names";

export interface Resolution {
  isDefined(name: string): boolean;
  coordinatesOf(tree: Node, locals: readonly string[]): ReadonlySet<string>; // ⊆ COORDINATE_NAMES, through definitions
  duplicates: ReadonlySet<string>; // names with two or more error-free heads
  cyclicRows: ReadonlySet<string>; // row ids
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
  const defined = new Set(rows.flatMap((row) => declaredHead(row)?.name ?? []));
  const heads: DefiningRow[] = rows.flatMap((row) =>
    row.head !== null && row.error === null ? [{ id: row.source.id, head: row.head }] : []
  );
  const duplicates = repeatedNames(heads.map(({ head }) => head.name)),
    graph = dependencyGraph(heads.filter(({ head }) => !duplicates.has(head.name))),
    cyclicRows = cyclicRowIds(graph);
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
    coordinatesOf(tree, locals) {
      const found = new Set<string>();
      for (const { name } of collectNameUses(tree)) {
        if (locals.includes(name)) continue;
        if (COORDINATE_NAMES.includes(name)) found.add(name);
        else for (const coordinate of reached.get(name) ?? []) found.add(coordinate);
      }
      return found;
    },
    duplicates,
    cyclicRows,
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
 * whose body uses its own name, is a cycle, and every row in it is cyclic.
 */
function cyclicRowIds({ rows, edges }: DependencyGraph): Set<string> {
  const order = rows.map(() => -1),
    low = rows.map(() => -1),
    onStack = rows.map(() => false),
    stack: number[] = [],
    cyclic = new Set<string>();
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
    if (component.length > 1 || edges[v].includes(v)) {
      for (const w of component) cyclic.add(rows[w].id);
    }
  };
  rows.forEach((_, v) => {
    if (order[v] === -1) visit(v);
  });
  return cyclic;
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
    for (const { name } of collectNameUses(head.body)) {
      if (head.params.includes(name)) continue;
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
