import { expect, it } from "vitest";
import type { Node } from "./ast";
import { sourceChildren } from "./ast";
import { countNodes, toSExpr, treesEqual } from "./index";

const s = { start: 0, end: 0 },
  x: Node = { kind: "id", name: "x", span: s },
  n = (value: number): Node => ({ kind: "num", value, span: s });
const chain: Node = { kind: "rel", ops: ["<=", "<"], operands: [n(0), x, n(10)], span: s },
  root: Node = { kind: "root", arg: x, index: n(3), span: s };
it("PR-40 toSExpr writes the corpus tree notation", () => {
  expect(
    [
      chain,
      root,
      { kind: "neg", arg: n(0.5), span: s } as Node,
      {
        kind: "rel",
        ops: ["="],
        operands: [x, { kind: "const", name: "pi", span: s }],
        span: s,
      } as Node,
      { kind: "call", name: "log", args: [x, { kind: "id", name: "b", span: s }], span: s } as Node,
    ].map(toSExpr)
  ).toEqual([
    "(rel (<= <) (num 0) (id x) (num 10))",
    "(root (id x) (num 3))",
    "(neg (num 0.5))",
    "(rel = (id x) (const pi))",
    "(call log (id x) (id b))",
  ]);
});
it("treesEqual ignores spans and compares every other field; countNodes counts every node", () => {
  expect([
    treesEqual(chain, { ...chain, span: { start: 3, end: 9 } }),
    treesEqual(chain, { ...chain, ops: ["<", "<"] }),
    treesEqual(root, { ...root, index: null }),
  ]).toEqual([true, false, false]);
  expect([countNodes(x), countNodes(root), countNodes(chain)]).toEqual([1, 3, 4]);
});
it("sourceChildren lists every node kind's children in source order", () => {
  const y: Node = { kind: "id", name: "y", span: s };
  const two = (kind: "add" | "sub" | "mul" | "div" | "pow"): Node => ({
    kind,
    left: x,
    right: y,
    span: s,
  });
  const one = (kind: "neg" | "pct" | "fact" | "abs"): Node => ({ kind, arg: x, span: s });
  const cases: [Node, Node[]][] = [
    [n(1), []],
    [x, []],
    [{ kind: "const", name: "e", span: s }, []],
    ...(["add", "sub", "mul", "div", "pow"] as const).map((k): [Node, Node[]] => [two(k), [x, y]]),
    ...(["neg", "pct", "fact", "abs"] as const).map((k): [Node, Node[]] => [one(k), [x]]),
    [root, [n(3), x]],
    [{ kind: "root", arg: x, index: null, span: s }, [x]],
    [{ kind: "call", name: "f", args: [x, y], span: s }, [x, y]],
    [{ kind: "point", x, y, span: s }, [x, y]],
    [chain, [n(0), x, n(10)]],
    [{ kind: "list", items: [x, y, n(2)], span: s }, [x, y, n(2)]],
    [{ kind: "list", items: [n(1), n(5)], range: 1, span: s }, [n(1), n(5)]],
    [{ kind: "sim", left: y, right: x, span: s }, [y, x]],
  ];
  const kinds = new Set(cases.map(([node]) => node.kind));
  expect(kinds.size).toBe(18);
  for (const [node, expected] of cases) expect(sourceChildren(node)).toEqual(expected);
});
