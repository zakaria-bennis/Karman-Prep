// Reserved names (RC-3) and the names a parse tree uses. Pure TypeScript: no DOM (AR-44).

import { primedName, sourceChildren, type Node, type SourceSpan } from "../latex/ast";
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
  counted: boolean; // in an argument of count or length, which read only how many values it holds
}

/** FN-2, FN-23: count and length use their arguments' lengths, never their values. */
const COUNTING_NAMES: ReadonlySet<string> = new Set(["count", "length"]);

/**
 * FN-2, FN-34, FN-38, NM-31, NM-36: the children of `node` whose values decide how many values it
 * holds, so count and length read them: a range's bounds, a range or filter index's items,
 * repeat's counts and every argument of unique. `length([1,2,3]x)` is 3 for every x, while
 * `length(repeat(1,x))` depends on x.
 */
export function lengthShaping(node: Node): readonly Node[] {
  switch (node.kind) {
    case "list":
      return node.range === undefined ? [] : node.items;
    case "index":
      return node.range !== undefined || node.items[0]?.kind === "rel" ? node.items : [];
    case "call":
      if (node.name === "repeat") return node.args.slice(1);
      if (node.name === "random") return node.args.slice(0, 2); // random(n): n elements
      return node.name === "unique" ? node.args : [];
    default:
      return [];
  }
}

/**
 * Every use of a name in `tree`: each `id`, and each `call` of a non-built-in name (a pre-scanned
 * user function, PR-23, or its derivative `f'`, a use of f) with `call: true`; a member after a dot (`D.pleft`, PR-45) names nothing. Sorted by `span.start`; ties keep tree order, a node
 * before its children. Iterative, so a deep tree cannot overflow the stack.
 */
export function collectNameUses(tree: Node): NameUse[] {
  const uses: NameUse[] = [];
  const none: ReadonlySet<string> = new Set();
  const pending: [Node, boolean, boolean, ReadonlySet<string>][] = [[tree, false, false, none]];
  for (let entry = pending.pop(); entry !== undefined; entry = pending.pop()) {
    const [node, inPoint, counted, local] = entry;
    if (node.kind === "id" && !local.has(node.name)) {
      uses.push({ name: node.name, span: node.span, call: false, inPoint, counted });
    } else if (node.kind === "call" && !isBuiltinName(node.name) && node.member === undefined) {
      // PR-28: a derivative's call `f'(x)` uses f
      const name = primedName(node.name)?.base ?? node.name;
      uses.push({ name, span: node.span, call: true, inPoint, counted });
    }
    const below = inPoint || node.kind === "point";
    const counts = counted || (node.kind === "call" && COUNTING_NAMES.has(node.name));
    const kids = sourceChildren(node),
      shaping = counts ? lengthShaping(node) : [];
    // NM-37: a comprehension's names are local to its body
    const inner =
      node.kind === "for" ? new Set([...local, ...node.bindings.map((b) => b.name)]) : local;
    for (let i = kids.length - 1; i >= 0; i -= 1) {
      const scope = node.kind === "for" && i === 0 ? inner : local;
      pending.push([kids[i], below, counts && !shaping.includes(kids[i]), scope]);
    }
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
