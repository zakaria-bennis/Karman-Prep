import { describe, expect, it } from "vitest";
import sweep from "./__fixtures__/regression-sweep.json";
import { runSweepCase, sweepDiffs, type SweepCase } from "./__fixtures__/regression-sweep-run";

/**
 * The regression parity sweep: equations used as solvers, systems through lists (the owner's
 * `[5\%\operatorname{of}a,b]\sim[b,2c]` with a slider a, 2026-10-22), table fits, braces, parameter
 * placement and starting-value cases, each with what live Desmos showed on every row (captured
 * 2026-10-22). Each case must match Desmos unless it is a known difference: then it must still give
 * the recorded outcome, so a fix (or a regression) shows up here and the entry is updated.
 */
const CASES = sweep as unknown as SweepCase[];

describe("regression sweep against live Desmos (2026-10-22)", () => {
  const groups = new Map<string, SweepCase[]>();
  for (const c of CASES) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
  for (const [group, cases] of groups) {
    it(`${group}: ${cases.length} cases`, async () => {
      const failures: string[] = [];
      for (const c of cases) {
        const diffs = sweepDiffs(await runSweepCase(c), c.known?.ours ?? c.desmos);
        if (diffs.length > 0) failures.push(`${c.name}: ${diffs.join("; ")}`);
      }
      expect(failures).toEqual([]);
    }, 60_000);
  }
});
