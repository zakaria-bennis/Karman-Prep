// Parse-tree types and tree helpers. index.ts re-exports the helpers.

export interface SourceSpan {
  start: number;
  end: number;
} // UTF-16 offsets into normalizeLatex(input)
export type RelOp = "=" | "<" | ">" | "<=" | ">=";
export type InequalityOp = Exclude<RelOp, "=">;
export type ConstName = "e" | "pi" | "tau";
/** PR-45, NM-32: a coordinate member, `P.x`; points have two, so `.z` is an error. */
export type Axis = "x" | "y" | "z";
/** A relation or chain, `operands.length === ops.length + 1` (G12, PR-29). */
export interface Relation {
  kind: "rel";
  ops: RelOp[];
  operands: Node[];
  span: SourceSpan;
}
/** PR-31: one `c:v` part of a piecewise; `value` is null for a bare condition `c`, which is 1. */
export interface Branch {
  cond: Relation;
  value: Node | null;
}
export type Node =
  | { kind: "num"; value: number; span: SourceSpan }
  | { kind: "id"; name: string; span: SourceSpan } // "x", "A", "a_{1}", "v_{max}", "\\alpha", "e_{3}"
  | { kind: "const"; name: ConstName; span: SourceSpan }
  | { kind: "add" | "sub" | "mul" | "div" | "pow"; left: Node; right: Node; span: SourceSpan }
  | { kind: "neg" | "pct" | "deg" | "fact" | "abs"; arg: Node; span: SourceSpan }
  | { kind: "root"; arg: Node; index: Node | null; span: SourceSpan } // \sqrt, \sqrt[n]
  // PR-27: `\log_{b}x` is call "log" with args [x, b] and `base`, which marks the last argument as
  // the subscript, so RC-20 counts only the written ones (`\log(x,b)` is an arity error).
  // PR-45, FN-47 to FN-51: `T.\operatorname{pdf}(x)` is call "pdf" with args [T, x] and `member`
  // "method"; `T.\operatorname{mean}`, without parentheses, has `member` "property", and so has a
  // coordinate `P.x`, call "x" with args [P] (coordinateAxis).
  | {
      kind: "call";
      name: string;
      args: Node[];
      base?: true;
      member?: "method" | "property";
      span: SourceSpan;
    }
  | { kind: "point"; x: Node; y: Node; span: SourceSpan }
  | Relation
  // PR-34: `[a,b,c]` and `[]`; a table column (D-11). A range has `range`, the number of items
  // written before its ellipsis: `[a...b]` is items [a, b] with range 1 and `[a,b,...,c]` items
  // [a, b, c] with range 2. NM-36 expands it when evaluated.
  | { kind: "list"; items: Node[]; range?: number; span: SourceSpan }
  // PR-34, NM-30, NM-31: `T[…]` after a name, call, list, number or index. `items` and `range` are
  // the bracket's contents, read as a list's are, except that a range side may be empty (`L[2...]`,
  // `L[...3]`, `L[...]`); one relation item filters (`L[L>2]`).
  | { kind: "index"; target: Node; items: Node[]; range?: number; span: SourceSpan }
  | { kind: "sim"; left: Node; right: Node; span: SourceSpan } // PR-30, D-2: a regression row L ~ M
  // PR-31, PR-32: `\{c_1:v_1,c_2,…,v\}`, its parts with a condition in order and the bare last
  // value (the otherwise case) or null. A restriction is a product with one (`y=x\{x>0\}`).
  | { kind: "piecewise"; branches: Branch[]; otherwise: Node | null; span: SourceSpan };

export const isAxis = (name: string): name is Axis => name === "x" || name === "y" || name === "z";

/** PR-45, NM-32: the axis a coordinate member `P.x` reads, else null. */
export function coordinateAxis(node: Node): Axis | null {
  return node.kind === "call" && node.member === "property" && isAxis(node.name) ? node.name : null;
}

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
    case "index":
      return [node.target, ...node.items];
    case "piecewise":
      return [
        ...node.branches.flatMap(({ cond, value }) => (value === null ? [cond] : [cond, value])),
        ...(node.otherwise === null ? [] : [node.otherwise]),
      ];
  }
}

/**
 * `(list A B)`; a range `(range A B)` or `(range A S B)`, and with more values on a side or an
 * empty side, the starts and the ends each grouped: `(range (A B C) (D))`, `(range (A) ())`.
 */
function listSExpr(tree: { items: readonly Node[]; range?: number }): string {
  const items = tree.items.map(toSExpr);
  const { range } = tree;
  if (range === undefined) return `(${["list", ...items].join(" ")})`;
  if (range >= 1 && range <= 2 && items.length === range + 1) {
    return `(${["range", ...items].join(" ")})`;
  }
  const group = (part: string[]) => `(${part.join(" ")})`;
  return `(range ${group(items.slice(0, range))} ${group(items.slice(range))})`;
}

/**
 * The corpus tree notation (PR-40): `(num 0.5)`, `(id a_{1})`, `(const pi)`, `(root A N)`,
 * `(call log X B)`, a member `(call .pdf T X)`, `(rel = A B)` for one relation and `(rel (<= <) A B C)` for a chain; a list is
 * `(list A B)` and a range `(range A B)`, `(range A S B)` or `(range (A S T) (B))` (PR-34, listSExpr).
 * An index is `(index T I)` for one item, else `(index T (list I J))` or `(index T (range …))`.
 * A piecewise is `(piecewise (if C V) (if C) O)`: a part with a value, a bare condition, then the
 * otherwise value when there is one (PR-31).
 */
export function toSExpr(tree: Node): string {
  switch (tree.kind) {
    case "num":
      return `(num ${String(tree.value)})`;
    case "id":
    case "const":
      return `(${tree.kind} ${tree.name})`;
    case "call": {
      const name = tree.member === undefined ? tree.name : `.${tree.name}`;
      return `(${["call", name, ...tree.args.map(toSExpr)].join(" ")})`;
    }
    case "list":
      return listSExpr(tree);
    case "index": {
      const one = tree.range === undefined && tree.items.length === 1;
      return `(index ${toSExpr(tree.target)} ${one ? toSExpr(tree.items[0]) : listSExpr(tree)})`;
    }
    case "root": {
      const parts = tree.index === null ? [tree.arg] : [tree.arg, tree.index];
      return `(${["root", ...parts.map(toSExpr)].join(" ")})`;
    }
    case "piecewise": {
      const parts = tree.branches.map(({ cond, value }) =>
        value === null ? `(if ${toSExpr(cond)})` : `(if ${toSExpr(cond)} ${toSExpr(value)})`
      );
      if (tree.otherwise !== null) parts.push(toSExpr(tree.otherwise));
      return `(${["piecewise", ...parts].join(" ")})`;
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
