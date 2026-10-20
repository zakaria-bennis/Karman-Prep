import { describe, expect, it } from "vitest";
import { parseLatex } from "../latex/index";
import { compileRealFunction1, evaluateLatex } from "./compile";
import { filterValue, pickValue } from "./index-list";
import { UNDEFINED, type Value } from "./values";

const n = (value: number): Value => ({ type: "number", value });
const list = (...items: (number | null)[]): Value => ({
  type: "list",
  value: items.map((v) => (v === null ? UNDEFINED : n(v))),
});
const ROWS = { rows: ["L=[5,3,8,1]"] };

describe("indexing, slicing and filtering", () => {
  it("NM-30 an index is 1-based and rounded down; out of range or not a number is undefined", () => {
    const L = list(5, 3, 8, 1);
    expect(pickValue(L, n(1))).toEqual(n(5));
    expect(pickValue(L, n(4.99))).toEqual(n(1));
    expect(pickValue(L, n(0.99))).toEqual(UNDEFINED);
    expect(pickValue(L, n(5))).toEqual(UNDEFINED);
    expect(pickValue(L, UNDEFINED)).toEqual(UNDEFINED);
    expect(pickValue(L, list(2, 0, 4))).toEqual(list(3, null, 1));
    expect(pickValue(n(5), n(1))).toEqual(UNDEFINED);
  });

  it("NM-31 a filter keeps elements whose mask holds, paired to the shorter list", () => {
    const L = list(5, 3, 8, 1);
    expect(filterValue(L, list(1, null, 1))).toEqual(list(5, 8));
    expect(filterValue(L, n(1))).toEqual(L);
    expect(filterValue(L, UNDEFINED)).toEqual(list());
    expect(filterValue(n(2), n(1))).toEqual(UNDEFINED);
  });

  it("NM-30, NM-31 rows index, slice and filter after their definitions, as Desmos does", () => {
    expect(evaluateLatex("L[2]^{2}", ROWS)).toEqual(n(9));
    expect(evaluateLatex("L[3...1]", ROWS)).toEqual(list(8, 3, 5));
    expect(evaluateLatex("L[3...]", ROWS)).toEqual(list(8, 1));
    expect(evaluateLatex("L[...2]", ROWS)).toEqual(list(5, 3));
    expect(evaluateLatex("L[L\\le3]", ROWS)).toEqual(list(3, 1));
    expect(evaluateLatex("L[1<2]", ROWS)).toEqual(list(5, 3, 8, 1));
    expect(evaluateLatex("L[L>3]+L[1]", ROWS)).toEqual(list(10, 13));
    expect(evaluateLatex("f(2)", { rows: ["L=[5,3,8,1]", "f(k)=L[k]"] })).toEqual(n(3));
  });

  it("NM-30 a [ after any term indexes it, as the reference's parser binds it tighter than * ", () => {
    expect(evaluateLatex("(L+1)[2]", ROWS)).toEqual(n(4));
    expect(evaluateLatex("L^{2}[1]", ROWS)).toEqual(n(25));
    expect(evaluateLatex("2L[1]", ROWS)).toEqual(n(10));
    expect(evaluateLatex("-L[1]", ROWS)).toEqual(n(-5));
  });
});

it("NM-30 L[x] plots as a step function of x through the values of L", () => {
  const parsed = parseLatex("L[x]");
  if (!parsed.ok) throw new Error("L[x]");
  const scope = {
    functions: new Map(),
    values: new Map([["L", list(5, 3, 8, 1)]]),
    settings: { angleMode: "radians" as const, complex: false },
  };
  const f = compileRealFunction1(parsed.tree, "x", scope);
  expect([0.5, 1, 1.9, 2.5, 4.2, 5].map(f)).toEqual([NaN, 5, 5, 3, 1, NaN]);
});

it("NM-30 an index of any list that uses no variable plots as a step function too", () => {
  const scope = {
    functions: new Map([["f", { name: "f", params: ["a"], body: tree("L[a...][x]"), rowId: "f" }]]),
    values: new Map([["L", list(5, 3, 8, 1)]]),
    settings: { angleMode: "radians" as const, complex: false },
  };
  const at = (latex: string) => [1, 2.5, 4].map(compileRealFunction1(tree(latex), "x", scope));
  expect(at("[1...5][x]")).toEqual([1, 2, 4]);
  expect(at("L[2...][x]")).toEqual([3, 8, NaN]);
  expect(at("L[L>2][x]")).toEqual([5, 3, NaN]);
  expect(at("L[[4,3]][x]")).toEqual([1, 8, NaN]);
  expect(at("(L+1)[x]")).toEqual([6, 4, 2]);
  // a list that varies is not folded: the general evaluator runs it with x, which a function
  // body without x as a parameter does not see, and analysis rejects `[x...5]` as a row
  expect(at("f(2)")).toEqual([NaN, NaN, NaN]);
  expect(at("[x...5][1]")).toEqual([1, 2.5, 4]);
});

function tree(latex: string) {
  const parsed = parseLatex(latex);
  if (!parsed.ok) throw new Error(latex);
  return parsed.tree;
}
