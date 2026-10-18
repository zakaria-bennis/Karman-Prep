import { expect, it } from "vitest";
import type { Node } from "./ast";
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
