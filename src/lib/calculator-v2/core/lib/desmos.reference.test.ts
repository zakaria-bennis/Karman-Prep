// Desmos parity (appendix F decision 2): every value captured from desmos.com/calculator on
// 2026-10-19 for a built-in v2 has shipped, evaluated by the v2 engine. A whole-number value must
// match exactly, any other within FN-11's relative 1e-12, and null (undefined in Desmos) must be
// undefined. Each family states how many captured values it covers, so none is skipped silently.
import { expect, it } from "vitest";
import captured from "../../../../../docs/superpowers/plans/2026-10-19-calculator-v2-phase2-desmos/desmos-reference-values.json";
import { evaluateLatex } from "../eval/compile";
import { withinTolerance } from "./tolerance";

type Captured = number | number[] | null;
const VALUES: [string, Captured][] = Object.entries(captured.values);

const FAMILIES: { rules: string; pattern: RegExp; count: number }[] = [
  {
    rules: "FN-76 FN-77 FN-78",
    pattern: /^\\operatorname\{(floor|ceil|round|sign|mod|nCr|nPr)\}\(/,
    count: 22,
  },
  { rules: "NM-15 FN-79", pattern: /^[^[]*!$/, count: 7 },
];

for (const { rules, pattern, count } of FAMILIES) {
  const cases = VALUES.filter(([latex]) => pattern.test(latex));
  it(`${rules} all ${count} captured Desmos values are checked`, () =>
    expect(cases.length).toBe(count));
  for (const [latex, expected] of cases)
    it(`${rules} ${latex} is ${String(expected)}, as in Desmos`, () => {
      const v = evaluateLatex(latex);
      if (Array.isArray(expected)) throw new Error("list values are checked once lists ship");
      if (expected === null) {
        expect(v).toEqual({ type: "undefined" });
      } else if (Number.isInteger(expected)) {
        expect(v).toEqual({ type: "number", value: expected });
      } else {
        expect(
          v.type === "number" && withinTolerance(v.value, expected, "default"),
          JSON.stringify(v)
        ).toBe(true);
      }
    });
}
