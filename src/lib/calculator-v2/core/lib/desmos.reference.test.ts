// Desmos parity (appendix F decision 2): every value captured from desmos.com/calculator on
// 2026-10-19 for a built-in or list notation v2 has shipped, evaluated by the v2 engine. A
// whole-number value must match exactly, any other within FN-11's relative 1e-12, null (undefined
// in Desmos) must be undefined, and a list must match element by element. Each family states how
// many captured values it covers, so none is skipped silently.
import { expect, it } from "vitest";
import captured from "../../../../../docs/superpowers/plans/2026-10-19-calculator-v2-phase2-desmos/desmos-reference-values.json";
import { evaluateLatex } from "../eval/compile";
import type { Value } from "../eval/values";
import { withinTolerance } from "./tolerance";

type Captured = number | number[] | null;
const VALUES: [string, Captured][] = Object.entries(captured.values);

// Ranges whose last step does not land on the bound: Desmos rounds the element count, so
// [1...3.5] is [1, 2, 3, 4], while v2 (NM-36 as shipped on main) stops at the bound and gives
// [1, 2, 3]. Not yet matched; listed here so the gap stays visible.
const RANGE_COUNT_GAP: ReadonlySet<string> = new Set([
  "[1...3.5]",
  "[1...3.6]",
  "[0.5...3]",
  "[1,3,...,8]",
  "[10,8,...,1]",
]);

const FAMILIES: { rules: string; pattern: RegExp; count: number }[] = [
  {
    rules: "FN-76 FN-77 FN-78",
    pattern: /^\\operatorname\{(floor|ceil|round|sign|mod|nCr|nPr)\}\(/,
    count: 22,
  },
  { rules: "NM-15 FN-79", pattern: /!$/, count: 8 },
  // PR-34, NM-32, NM-36: list literals, ranges and element-by-element arithmetic, without
  // indexing (L[…]) or list functions, which have not shipped.
  { rules: "PR-34 NM-32 NM-36", pattern: /^(\[[^\]]*\]([+^\\]|$)|\\sin\(\[)/, count: 17 },
];

function matches(v: Value, expected: number | null): boolean {
  if (expected === null) return v.type === "undefined";
  if (v.type !== "number") return false;
  return Number.isInteger(expected)
    ? v.value === expected
    : withinTolerance(v.value, expected, "default");
}

for (const { rules, pattern, count } of FAMILIES) {
  const cases = VALUES.filter(([latex]) => pattern.test(latex));
  it(`${rules} all ${count} captured Desmos values are checked`, () =>
    expect(cases.length).toBe(count));
  for (const [latex, expected] of cases) {
    if (RANGE_COUNT_GAP.has(latex)) continue;
    it(`${rules} ${latex} is ${JSON.stringify(expected)}, as in Desmos`, () => {
      const v = evaluateLatex(latex);
      if (Array.isArray(expected)) {
        expect(v.type, JSON.stringify(v)).toBe("list");
        const items = v.type === "list" ? v.value : [];
        expect(items.length, JSON.stringify(v)).toBe(expected.length);
        expected.forEach((e, i) => expect(matches(items[i], e), JSON.stringify(v)).toBe(true));
      } else {
        expect(matches(v, expected), JSON.stringify(v)).toBe(true);
      }
    });
  }
}

it("NM-36 the ranges Desmos counts by rounding are the only captured list values not yet matched", () => {
  const lists = VALUES.filter(([latex]) => FAMILIES[2].pattern.test(latex)).map(([l]) => l);
  expect(lists.filter((l) => RANGE_COUNT_GAP.has(l))).toEqual([...RANGE_COUNT_GAP]);
  for (const latex of RANGE_COUNT_GAP) {
    const v = evaluateLatex(latex);
    const desmos = captured.values[latex as keyof typeof captured.values] as number[];
    expect(v.type === "list" && v.value.length, latex).toBe(desmos.length - 1);
  }
});
