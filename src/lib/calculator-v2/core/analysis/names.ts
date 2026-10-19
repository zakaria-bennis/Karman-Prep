// Reserved names (RC-3) and the names a parse tree uses. Pure TypeScript: no DOM (AR-44).

import { sourceChildren, type Node, type SourceSpan } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import type { AnalysisSettings } from "./index";

/** The coordinate names: `x` and `y`, and the polar `r` and `\theta` (RC-3). */
export const COORDINATE_NAMES: readonly string[] = Object.freeze(["x", "y", "r", "\\theta"]);

/** The constants' names as the parser writes them (`const` nodes): `e`, `\pi` and `\tau`. */
const CONSTANT_NAMES: ReadonlySet<string> = new Set(["e", "pi", "tau"]);

export interface NameUse {
  name: string;
  span: SourceSpan; // the id's span, or the whole call's span
  call: boolean; // a call of a name that is not built in
  inPoint: boolean; // below a point node
}

/**
 * Every use of a name in `tree`: each `id`, and each `call` of a non-built-in name (a pre-scanned
 * user function, PR-23) with `call: true`. Sorted by `span.start`; ties keep tree order, a node
 * before its children. Iterative, so a deep tree cannot overflow the stack.
 */
export function collectNameUses(tree: Node): NameUse[] {
  const uses: NameUse[] = [];
  const pending: [Node, boolean][] = [[tree, false]];
  for (let entry = pending.pop(); entry !== undefined; entry = pending.pop()) {
    const [node, inPoint] = entry;
    if (node.kind === "id") {
      uses.push({ name: node.name, span: node.span, call: false, inPoint });
    } else if (node.kind === "call" && !isBuiltinName(node.name)) {
      uses.push({ name: node.name, span: node.span, call: true, inPoint });
    }
    const below = inPoint || node.kind === "point";
    const kids = sourceChildren(node);
    for (let i = kids.length - 1; i >= 0; i -= 1) pending.push([kids[i], below]);
  }
  return uses.sort((a, b) => a.span.start - b.span.start);
}

/**
 * RC-3: the coordinates `x`, `y`, `r` and `\theta`, the constants `e`, `pi` and `tau`, `i` in
 * complex mode, and every built-in name. `t` is never reserved here; RC-2 decides its meaning.
 */
export function isReservedName(name: string, settings: AnalysisSettings): boolean {
  return (
    COORDINATE_NAMES.includes(name) ||
    CONSTANT_NAMES.has(name) ||
    (settings.complex && name === "i") ||
    isBuiltinName(name)
  );
}
