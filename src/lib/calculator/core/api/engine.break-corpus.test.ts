import { describe, expect, it } from "vitest";
import corpus from "./__fixtures__/break-corpus.json";
import { sameOutcome, type Outcome } from "./__fixtures__/break-outcome";
import { runBreakCase, type BreakCase } from "./__fixtures__/break-run";

/**
 * The adversarial corpus: absurd numbers, deep nesting, recursion, redefined built-ins, empty and
 * dangling notation, lists, ranges, piecewise, relations, points, pasted LaTeX, regressions,
 * sliders, calculus, complex and degree modes. Each case is a set of rows and what live Desmos's
 * `Calc.expressionAnalysis` gave on every row (captured 2026-10-20; the degree-sign cases and
 * more real-mode `i` cases 2026-10-21, owner decision). Every case must finish with
 * no thrown error, and match Desmos, unless it is a known difference: then it must still give the
 * recorded outcome, so a fix (or a regression) shows up here and the entry is updated.
 */
const CASES = corpus as BreakCase[];

const same = (a: Outcome[], b: Outcome[]) =>
  a.length === b.length && a.every((o, i) => sameOutcome(o, b[i]));

describe("the adversarial corpus against live Desmos (2026-10-20)", () => {
  const byCategory = new Map<string, BreakCase[]>();
  for (const c of CASES) byCategory.set(c.cat, [...(byCategory.get(c.cat) ?? []), c]);
  for (const [cat, cases] of byCategory) {
    it(`${cat}: ${cases.length} cases`, async () => {
      const failures: string[] = [];
      for (const c of cases) {
        const ours = await runBreakCase(c);
        const expected = c.known?.ours ?? c.desmos;
        if (!same(ours, expected)) {
          failures.push(
            `${JSON.stringify(c.rows)}${c.known ? ` (known: ${c.known.reason})` : ""}\n` +
              `  expected ${JSON.stringify(expected)}\n  ours     ${JSON.stringify(ours)}`
          );
        }
      }
      expect(failures).toEqual([]);
    }, 60_000);
  }
});
