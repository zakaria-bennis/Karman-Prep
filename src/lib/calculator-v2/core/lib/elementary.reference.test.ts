// NM-43, FN-1, FN-11: every operator and shipped built-in function against 40-digit reference
// values that scripts/calculator-v2/reference-elementary.mjs writes to elementary.json, plus the
// tolerance classes the comparisons use.
import { expect, it } from "vitest";
import reference from "../corpus/reference/elementary.json";
import {
  buildElementaryReference,
  ELEMENTARY_PATH,
  formatElementaryReference,
} from "../../../../../scripts/calculator-v2/reference-elementary.mjs";
import { withinTolerance } from "./tolerance";
import { BUILTIN_ARITY } from "./arity";
import { BUILTINS } from "./builtins";
import { evaluateLatex } from "../eval/compile";
import { OPERATOR_NAMES, SHIPPED } from "../latex/operator-names";
import { readFileSync } from "node:fs";

for (const c of reference.cases) {
  const gamma = c.op === "factorial"; // NM-44: Γ and factorial use relative 1e-12
  it(`${gamma ? "NM-44" : "NM-43"} ${c.id} is within ${gamma ? "1e-12" : "1e-13"} relative error of its 40-digit reference`, () => {
    const v = evaluateLatex(c.latex);
    expect(
      v.type === "number" &&
        withinTolerance(v.value, Number(c.expected), gamma ? "gamma" : "elementary"),
      `${JSON.stringify(v)} vs ${c.expected}`
    ).toBe(true);
  });
}
it("NM-43 elementary.json is exactly what its generator writes", async () =>
  expect(await formatElementaryReference(buildElementaryReference())).toBe(
    readFileSync(ELEMENTARY_PATH, "utf8")
  ));
it("FN-1 every shipped built-in and operator has a committed reference case, with the allowlist's arity", () => {
  const shipped = OPERATOR_NAMES.filter((o) => SHIPPED.has(o.name) && o.category !== null).map(
    (o) => o.name
  );
  expect(new Set(shipped)).toEqual(new Set(BUILTINS.keys()));
  expect([
    BUILTIN_ARITY.size,
    BUILTIN_ARITY.get("sin"),
    BUILTIN_ARITY.get("arctan"),
    BUILTIN_ARITY.get("log"),
    BUILTIN_ARITY.get("round"),
    BUILTIN_ARITY.get("nCr"),
  ]).toEqual([23, [1], [1, 2], [1, 2], [1, 2], [2]]);
  const ops = new Set(reference.cases.map((c) => c.op));
  for (const op of [
    ...shipped,
    "add",
    "sub",
    "mul",
    "div",
    "pow",
    "sqrt",
    "nthroot",
    "logBase",
    "arctan2",
    "factorial",
  ])
    expect(ops.has(op), op).toBe(true);
});
it("FN-11 tolerance classes compare as the table states", () => {
  expect([
    withinTolerance(1 + 0.9e-13, 1, "elementary"),
    withinTolerance(1 + 1.1e-13, 1, "elementary"),
  ]).toEqual([true, false]);
  expect([
    withinTolerance(0.5, 0.5, "snapped"),
    withinTolerance(0.5 + 2 ** -53, 0.5, "snapped"),
  ]).toEqual([true, false]);
  expect([
    withinTolerance(1 + 0.9e-12, 1, "default"),
    withinTolerance(1e-12, 0, "default"),
    withinTolerance(1.1e-12, 0, "default"),
  ]).toEqual([true, true, false]);
});
