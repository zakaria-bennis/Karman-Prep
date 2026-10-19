// Which sub-trees of a graphed expression are constant (MATHS-CORE-1, 2; NM-21, NM-3 amendment).
// Graphing folds each maximal constant sub-tree once through the exact value path, so a constant
// part plots the value its row shows, and only the parts that depend on a coordinate use doubles.
// A sub-tree is constant when evaluating it never reads a live name: x or y at the top of the
// graphed tree, and inside a user-function body also every parameter of every user function, since
// a call binds its parameters over the caller's variables. A name bound by a call inside the
// sub-tree reads that call's argument, which must itself be constant. Pure TypeScript: no DOM
// (AR-44).

import { sourceChildren, type Node } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import type { CompileScope } from "./compile";

/** Whether `node` is constant at the top of the graphed tree, or inside a user-function body. */
export type ConstantTest = (node: Node, inBody: boolean) => boolean;

const NONE: ReadonlySet<string> = new Set();

interface Walk {
  live: ReadonlySet<string>;
  memo: WeakMap<Node, boolean>; // results for a walk with nothing bound and no call in progress
  key: string;
}

export function constantTest(scope: CompileScope): ConstantTest {
  const bodyLive = new Set(["x", "y"]);
  for (const definition of scope.functions.values()) {
    for (const param of definition.params) bodyLive.add(param);
  }
  const top: Walk = { live: new Set(["x", "y"]), memo: new WeakMap(), key: "top" },
    body: Walk = { live: bodyLive, memo: new WeakMap(), key: "body" },
    calls = new Map<string, boolean>(), // final results per function, bound names and walk
    visiting = new Set<string>();

  /** The body of `name` with `bound` names bound; a call already in progress counts as constant. */
  const callConstant = (name: string, bound: ReadonlySet<string>, walk: Walk): boolean => {
    const definition = scope.functions.get(name);
    if (definition === undefined) return true; // undefined, whatever the coordinates
    const inner = new Set([...bound, ...definition.params]),
      key = `${walk.key}|${name}|${[...inner].sort().join(",")}`,
      known = calls.get(key);
    if (known !== undefined) return known;
    if (visiting.has(key)) return true; // a cycle: the rest of the walk decides
    visiting.add(key);
    const result = constant(definition.body, inner, walk);
    visiting.delete(key);
    // A result reached inside a cycle may lean on a provisional `true`, so only `false` and the
    // outermost call's result are final.
    if (!result || visiting.size === 0) calls.set(key, result);
    return result;
  };

  const constant = (node: Node, bound: ReadonlySet<string>, walk: Walk): boolean => {
    const memoize = bound.size === 0 && visiting.size === 0;
    if (memoize) {
      const known = walk.memo.get(node);
      if (known !== undefined) return known;
    }
    let result: boolean;
    if (node.kind === "id") {
      const { name } = node;
      if (bound.has(name)) result = true;
      else if (walk.live.has(name)) result = false;
      else if (scope.values.has(name) || !scope.functions.has(name)) result = true;
      else {
        const definition = scope.functions.get(name);
        result = definition?.params.length !== 0 || callConstant(name, bound, walk);
      }
    } else if (node.kind === "call" && !isBuiltinName(node.name)) {
      const definition = scope.functions.get(node.name);
      result =
        node.args.every((arg) => constant(arg, bound, walk)) &&
        (definition === undefined ||
          definition.params.length !== node.args.length ||
          callConstant(node.name, bound, walk));
    } else {
      result = sourceChildren(node).every((child) => constant(child, bound, walk));
    }
    if (memoize) walk.memo.set(node, result);
    return result;
  };

  return (node, inBody) => constant(node, NONE, inBody ? body : top);
}
