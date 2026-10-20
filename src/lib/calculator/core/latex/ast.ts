// Parse-tree types and tree helpers. index.ts re-exports the helpers.

export interface SourceSpan {
  start: number;
  end: number;
} // UTF-16 offsets into normalizeLatex(input)
export type RelOp = "=" | "<" | ">" | "<=" | ">=";
export type InequalityOp = Exclude<RelOp, "=">;
export type ConstName = "e" | "pi" | "tau";
export type Node =
  | { kind: "num"; value: number; span: SourceSpan }
  | { kind: "id"; name: string; span: SourceSpan } // "x", "A", "a_{1}", "v_{max}", "\\alpha", "e_{3}"
  | { kind: "const"; name: ConstName; span: SourceSpan }
  | { kind: "add" | "sub" | "mul" | "div" | "pow"; left: Node; right: Node; span: SourceSpan }
  | { kind: "neg" | "pct" | "deg" | "fact" | "abs"; arg: Node; span: SourceSpan }
  | { kind: "root"; arg: Node; index: Node | null; span: SourceSpan } // \sqrt, \sqrt[n]
  // PR-27: `\log_{b}x` is call "log" with args [x, b] and `base`, which marks the last argument as
  // the subscript, so RC-20 counts only the written ones (`\log(x,b)` is an arity error).
  | { kind: "call"; name: string; args: Node[]; base?: true; span: SourceSpan }
  | { kind: "point"; x: Node; y: Node; span: SourceSpan }
  | { kind: "rel"; ops: RelOp[]; operands: Node[]; span: SourceSpan } // operands.length === ops.length + 1
  // PR-34: `[a,b,c]` and `[]`; a table column (D-11). A range has `range`, the number of items
  // written before its ellipsis: `[a...b]` is items [a, b] with range 1 and `[a,b,...,c]` items
  // [a, b, c] with range 2. NM-36 expands it when evaluated.
  | { kind: "list"; items: Node[]; range?: number; span: SourceSpan }
  | { kind: "sim"; left: Node; right: Node; span: SourceSpan }; // PR-30, D-2: a regression row L ~ M

/**
 * The direct child nodes of `node`, in source order: a root's index comes before its argument.
 * The one shared child walker; tree passes use it instead of their own switch.
 */
export function sourceChildren(node: Node): readonly Node[] {
  switch (node.kind) {
    case "num":
    case "id":
    case "const":
      return [];
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
    case "sim":
      return [node.left, node.right];
    case "neg":
    case "pct":
    case "deg":
    case "fact":
    case "abs":
      return [node.arg];
    case "root":
      return node.index === null ? [node.arg] : [node.index, node.arg];
    case "call":
      return node.args;
    case "point":
      return [node.x, node.y];
    case "rel":
      return node.operands;
    case "list":
      return node.items;
  }
}

/**
 * `(list A B)`; a range `(range A B)` or `(range A S B)`, and with more values on a side, the
 * starts and the ends each grouped: `(range (A B C) (D))`.
 */
function listSExpr(tree: Extract<Node, { kind: "list" }>): string {
  const items = tree.items.map(toSExpr);
  const { range } = tree;
  if (range === undefined) return `(${["list", ...items].join(" ")})`;
  if (range <= 2 && items.length === range + 1) return `(${["range", ...items].join(" ")})`;
  const group = (part: string[]) => `(${part.join(" ")})`;
  return `(range ${group(items.slice(0, range))} ${group(items.slice(range))})`;
}

/**
 * The corpus tree notation (PR-40): `(num 0.5)`, `(id a_{1})`, `(const pi)`, `(root A N)`,
 * `(call log X B)`, `(rel = A B)` for one relation and `(rel (<= <) A B C)` for a chain; a list is
 * `(list A B)` and a range `(range A B)`, `(range A S B)` or `(range (A S T) (B))` (PR-34, listSExpr).
 */
export function toSExpr(tree: Node): string {
  switch (tree.kind) {
    case "num":
      return `(num ${String(tree.value)})`;
    case "id":
    case "const":
      return `(${tree.kind} ${tree.name})`;
    case "call":
      return `(${["call", tree.name, ...tree.args.map(toSExpr)].join(" ")})`;
    case "list":
      return listSExpr(tree);
    case "root": {
      const parts = tree.index === null ? [tree.arg] : [tree.arg, tree.index];
      return `(${["root", ...parts.map(toSExpr)].join(" ")})`;
    }
    case "rel": {
      const ops = tree.ops.length === 1 ? tree.ops[0] : `(${tree.ops.join(" ")})`;
      return `(${["rel", ops, ...tree.operands.map(toSExpr)].join(" ")})`;
    }
    default:
      return `(${[tree.kind, ...sourceChildren(tree).map(toSExpr)].join(" ")})`;
  }
}

/** Compares every field of two trees except `span`, at every depth. */
export function treesEqual(a: Node, b: Node): boolean {
  return sameIgnoringSpans(a, b);
}

function sameIgnoringSpans(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => sameIgnoringSpans(item, b[i]))
    );
  }
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return Object.is(a, b);
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter((k) => k !== "span");
  return (
    keys.length === Object.keys(right).filter((k) => k !== "span").length &&
    keys.every((k) => k in right && sameIgnoringSpans(left[k], right[k]))
  );
}

/** Every node of the tree, the root included. Iterative, so a deep tree cannot overflow the stack. */
export function countNodes(tree: Node): number {
  let count = 0;
  const pending: Node[] = [tree];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    count += 1;
    pending.push(...sourceChildren(node));
  }
  return count;
}
