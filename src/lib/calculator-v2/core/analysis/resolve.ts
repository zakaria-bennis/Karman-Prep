// Name resolution across rows (RC-6, RC-9, RC-10): which names some row defines, and which
// coordinates a tree reaches through definitions. Pure TypeScript: no DOM (AR-44).

import type { Node } from "../latex/ast";
import { declaredHead, type DefinitionHead, type ParsedRow } from "./definitions";
import { collectNameUses, COORDINATE_NAMES } from "./names";

export interface Resolution {
  isDefined(name: string): boolean;
  coordinatesOf(tree: Node, locals: readonly string[]): ReadonlySet<string>; // ⊆ COORDINATE_NAMES, through definitions
}

/**
 * Every head defines its name, with or without an error (RC-10). Coordinates pass through the
 * bodies of error-free heads only, each with its parameters as locals (RC-4); cycles are safe.
 */
export function resolveDefinitions(rows: readonly ParsedRow[]): Resolution {
  const defined = new Set(rows.flatMap((row) => declaredHead(row)?.name ?? []));
  const reached = reachedCoordinates(
    rows.flatMap((row) => (row.head !== null && row.error === null ? [row.head] : []))
  );
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
  };
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
